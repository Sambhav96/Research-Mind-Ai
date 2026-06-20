from datetime import datetime, timedelta
from uuid import UUID

from app.repositories.analytics import AnalyticsRepository
from app.schemas.analytics import AnalyticsSummaryResponse, WeeklyActivityItem, AIUsageMetric

class AnalyticsService:
    def __init__(self, repository: AnalyticsRepository):
        self.repository = repository

    async def get_summary(self, user_id: UUID) -> AnalyticsSummaryResponse:
        now = datetime.now()
        week_start = now - timedelta(days=7)

        doc_total, ready_total = await self.repository.get_document_counts(user_id)
        chats_count = await self.repository.get_chat_count(user_id)

        stats_results = await self.repository.get_study_session_stats(user_id)
        
        total_seconds = 0
        flashcards_count = 0
        quizzes_count = 0
        notes_count = 0
        
        for row in stats_results:
            total_seconds += row.duration
            if row.feature_used == "flashcards":
                flashcards_count += row.count
            elif row.feature_used in ("quiz", "quiz_completed", "quiz_generated"):
                if row.feature_used == "quiz" or row.feature_used == "quiz_completed":
                    quizzes_count += row.count
            elif row.feature_used == "notes":
                notes_count += row.count

        total_minutes = total_seconds // 60
        
        score = (total_minutes * 1) + (chats_count * 2) + (flashcards_count * 3) + (quizzes_count * 5)

        chart_results = await self.repository.get_weekly_study_chart_data(user_id, week_start)
        
        chart_data = []
        results_dict = {r.day: r.duration for r in chart_results}
        
        for i in range(7):
            d = (now - timedelta(days=6-i)).date()
            duration_seconds = results_dict.get(d, 0)
            minutes = duration_seconds // 60
            chart_data.append(WeeklyActivityItem(
                day=d.strftime("%a"),
                hours=minutes,
                count=minutes
            ))

        # Determine AI Usage
        # Let's count specific AI-heavy actions from stats
        # For simplicity, map some common metrics
        ai_chat_actions = 0
        ai_quiz_actions = 0
        ai_flashcard_actions = 0
        for row in stats_results:
            if row.feature_used == "chat":
                ai_chat_actions += row.count
            elif row.feature_used == "quiz_generated":
                ai_quiz_actions += row.count
            elif row.feature_used == "flashcards":
                ai_flashcard_actions += row.count
                
        ai_usage = [
            AIUsageMetric(label="Chat interactions", value=ai_chat_actions, max=100), # Using 100 as an arbitrary "max" goal
            AIUsageMetric(label="Quizzes generated", value=ai_quiz_actions, max=50),
            AIUsageMetric(label="Flashcards generated", value=ai_flashcard_actions, max=200)
        ]

        feature_distribution = {
            "Chat": ai_chat_actions,
            "Search": next((row.count for row in stats_results if row.feature_used == "search"), 0),
            "Flashcards": ai_flashcard_actions,
            "Quiz": ai_quiz_actions,
            "Notes": next((row.count for row in stats_results if row.feature_used == "notes"), 0),
        }

        return AnalyticsSummaryResponse(
            papers=doc_total,
            processed=ready_total,
            chats=chats_count,
            flashcards=flashcards_count,
            quizzes=quizzes_count,
            notes=notes_count,
            score=score,
            study_time=total_minutes,
            weekly_activity=chart_data,
            ai_usage=ai_usage,
            feature_distribution=feature_distribution
        )

    async def get_timeline(self, user_id: UUID, period: str) -> list[dict]:
        now = datetime.now()
        days = 7 if period == "weekly" else 30
        start_date = now - timedelta(days=days)

        results = await self.repository.get_timeline_data(user_id, start_date)
        
        # Group by date
        data_by_date = {}
        for i in range(days):
            d = (now - timedelta(days=(days - 1) - i)).date()
            data_by_date[d] = {
                "date": d.strftime("%b %d"),
                "chats": 0,
                "flashcards": 0,
                "quizzes": 0,
                "notes": 0,
                "total": 0
            }

        for row in results:
            d = row.day
            if d not in data_by_date:
                continue
            
            feat = row.feature_used
            cnt = row.count

            if feat == "chat":
                data_by_date[d]["chats"] += cnt
            elif feat == "flashcards":
                data_by_date[d]["flashcards"] += cnt
            elif feat in ("quiz", "quiz_started", "quiz_generated", "quiz_completed"):
                # to avoid overcounting, let's just count quiz_completed or quiz_generated depending on prompt. "Quizzes completed" 
                if feat in ("quiz", "quiz_completed"):
                    data_by_date[d]["quizzes"] += cnt
            elif feat == "notes":
                data_by_date[d]["notes"] += cnt
                
            data_by_date[d]["total"] = data_by_date[d]["chats"] + data_by_date[d]["flashcards"] + data_by_date[d]["quizzes"] + data_by_date[d]["notes"]

        return list(data_by_date.values())

    async def get_top_papers(self, user_id: UUID) -> list[dict]:
        docs = await self.repository.get_all_documents(user_id)
        chats = await self.repository.get_all_chat_sessions(user_id)
        chat_msg_counts = await self.repository.get_chat_message_counts_by_session(user_id)
        decks = await self.repository.get_all_flashcard_decks(user_id)
        quizzes = await self.repository.get_all_quiz_sets(user_id)

        doc_stats = {}
        for doc in docs:
            doc_stats[str(doc.id)] = {
                "id": str(doc.id),
                "title": doc.title or doc.filename or "Untitled Document",
                "views": 0,
                "chat_questions": 0,
                "flashcards": 0,
                "quizzes": 0,
                "notes": 0,
                "total_interactions": 0
            }

        for chat in chats:
            if chat.selected_document_ids:
                q_count = chat_msg_counts.get(str(chat.id), 0)
                for doc_id_str in chat.selected_document_ids:
                    if doc_id_str in doc_stats:
                        doc_stats[doc_id_str]["chat_questions"] += q_count
                        doc_stats[doc_id_str]["total_interactions"] += q_count

        for deck in decks:
            if deck.document_id:
                doc_id_str = str(deck.document_id)
                if doc_id_str in doc_stats:
                    doc_stats[doc_id_str]["flashcards"] += deck.card_count
                    doc_stats[doc_id_str]["total_interactions"] += deck.card_count

        for quiz in quizzes:
            if quiz.document_id:
                doc_id_str = str(quiz.document_id)
                if doc_id_str in doc_stats:
                    doc_stats[doc_id_str]["quizzes"] += quiz.question_count
                    doc_stats[doc_id_str]["total_interactions"] += quiz.question_count

        sorted_docs = sorted(doc_stats.values(), key=lambda x: x["total_interactions"], reverse=True)
        return sorted_docs[:5]

    async def get_streaks(self, user_id: UUID) -> dict:
        dates = await self.repository.get_active_dates(user_id)
        
        if not dates:
            return {
                "current_streak": 0,
                "best_streak": 0,
                "last_active_day": None,
                "study_consistency": 0
            }
            
        today = datetime.now().date()
        
        # Calculate current streak
        current_streak = 0
        check_date = today
        
        if dates[0] == today:
            current_streak = 1
            check_date = today - timedelta(days=1)
            idx = 1
        elif dates[0] == today - timedelta(days=1):
            current_streak = 1
            check_date = today - timedelta(days=2)
            idx = 1
        else:
            # no current streak
            idx = 0
            
        if current_streak > 0:
            while idx < len(dates) and dates[idx] == check_date:
                current_streak += 1
                check_date -= timedelta(days=1)
                idx += 1
                
        # Calculate best streak
        best_streak = 0
        if dates:
            current_count = 1
            best_streak = 1
            for i in range(1, len(dates)):
                if dates[i-1] - dates[i] == timedelta(days=1):
                    current_count += 1
                else:
                    current_count = 1
                best_streak = max(best_streak, current_count)
                
        # Study consistency (last 30 days)
        thirty_days_ago = today - timedelta(days=30)
        active_last_30 = sum(1 for d in dates if d > thirty_days_ago)
        consistency = int((active_last_30 / 30.0) * 100)
        
        return {
            "current_streak": current_streak,
            "best_streak": best_streak,
            "last_active_day": dates[0].isoformat(),
            "study_consistency": consistency
        }
