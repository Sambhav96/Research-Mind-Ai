$path = 'c:\Users\sambh\OneDrive\Desktop\Scholar ai\frontend\src\app\(admin)\admin\(protected)'
$files = Get-ChildItem -Path $path -Recurse -Filter "*.tsx"

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    
    $content = $content -replace "bg-slate-900/50", "bg-secondary/50"
    $content = $content -replace "bg-slate-900/30", "bg-secondary/30"
    $content = $content -replace "bg-slate-900/80", "bg-secondary/80"
    $content = $content -replace "bg-slate-900", "bg-secondary"
    $content = $content -replace "bg-slate-950", "bg-background"
    
    $content = $content -replace "border-slate-800", "border-border/50"
    $content = $content -replace "border-slate-700", "border-border"
    
    $content = $content -replace "text-slate-100", "text-foreground"
    $content = $content -replace "text-slate-200", "text-foreground"
    $content = $content -replace "text-slate-300", "text-muted-foreground"
    $content = $content -replace "text-slate-400", "text-muted-foreground"
    $content = $content -replace "text-slate-500", "text-muted-foreground"
    
    $content = $content -replace "hover:bg-slate-800", "hover:bg-secondary/80"
    $content = $content -replace "hover:border-slate-700", "hover:border-border"
    
    Set-Content -Path $file.FullName -Value $content -NoNewline
}
