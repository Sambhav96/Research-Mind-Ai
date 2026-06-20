"use client";

import { useEffect, useState } from "react";
import { adminUsersApi, AdminUserListItem } from "@/lib/api/admin-users-api";
import { 
  Users, Search, Filter, MoreVertical, 
  ShieldAlert, RefreshCw, ChevronLeft, ChevronRight, CheckCircle2, XCircle
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("All");
  const [status, setStatus] = useState("All");
  const [verification, setVerification] = useState("All");
  const [signupDateFrom, setSignupDateFrom] = useState("");
  const [signupDateTo, setSignupDateTo] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminUsersApi.getUsersList({ 
        page, size: 10, search, plan, status, verification, signupDateFrom, signupDateTo 
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to fetch users", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, plan, status, verification, signupDateFrom, signupDateTo]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const totalPages = Math.ceil(total / 10);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
                <Users className="w-8 h-8 text-indigo-400" />
                User Management
              </h1>
              <p className="text-muted-foreground">View and manage all registered platform users.</p>
            </div>
          </div>

          <div className="bg-secondary/50 border border-border/50 rounded-2xl p-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-background border border-border/50 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </form>
                
                <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                  <select
                    value={plan}
                    onChange={(e) => { setPlan(e.target.value); setPage(1); }}
                    className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="All">All Plans</option>
                    <option value="Free">Free</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                  
                  <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                  </select>

                  <select
                    value={verification}
                    onChange={(e) => { setVerification(e.target.value); setPage(1); }}
                    className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="All">All Verification</option>
                    <option value="Verified">Verified</option>
                    <option value="Unverified">Unverified</option>
                  </select>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-background/50 p-3 rounded-lg border border-border/50/50">
                <span className="text-sm text-muted-foreground font-medium">Signup Date:</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                    type="date" 
                    value={signupDateFrom}
                    onChange={(e) => { setSignupDateFrom(e.target.value); setPage(1); }}
                    className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-muted-foreground"
                  />
                  <span className="text-muted-foreground">to</span>
                  <input 
                    type="date" 
                    value={signupDateTo}
                    onChange={(e) => { setSignupDateTo(e.target.value); setPage(1); }}
                    className="bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-muted-foreground"
                  />
                  {(signupDateFrom || signupDateTo) && (
                    <button 
                      onClick={() => { setSignupDateFrom(""); setSignupDateTo(""); setPage(1); }}
                      className="ml-2 text-xs text-rose-400 hover:text-rose-300"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-background/50 text-muted-foreground border-y border-border/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Joined</th>
                    <th className="px-4 py-3 font-medium">Docs</th>
                    <th className="px-4 py-3 font-medium">Score</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500 mx-auto" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <motion.tr 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        key={user.id} 
                        className="hover:bg-secondary/80 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="font-medium text-foreground">{user.name || "Unnamed"}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                            user.plan === 'enterprise' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            user.plan === 'pro' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            'bg-secondary text-muted-foreground border-border'
                          }`}>
                            {user.plan.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5">
                            {user.is_active ? (
                              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <span className="text-emerald-500 text-xs">Active</span></>
                            ) : (
                              <><XCircle className="w-4 h-4 text-rose-500" /> <span className="text-rose-500 text-xs">Suspended</span></>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground font-medium">
                          {user.document_count}
                        </td>
                        <td className="px-4 py-4 text-indigo-400 font-bold">
                          {user.research_score}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link 
                            href={`/admin/users/${user.id}`}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-indigo-600 hover:text-white rounded-lg transition-colors border border-border hover:border-indigo-500"
                          >
                            View Details
                          </Link>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  Showing <span className="font-medium text-muted-foreground">{((page - 1) * 10) + 1}</span> to <span className="font-medium text-muted-foreground">{Math.min(page * 10, total)}</span> of <span className="font-medium text-muted-foreground">{total}</span> users
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-border/50 bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium px-2">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-border/50 bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
      </main>
    );
}
