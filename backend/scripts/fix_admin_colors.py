import os
import re

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # We want to replace `text-white` with `text-foreground`, BUT ONLY IF:
    # it is not part of a word like `hover:text-white`
    # AND it is not inside a className string that contains solid dark backgrounds like `bg-indigo-`, `bg-rose-`, `bg-emerald-`, `bg-blue-`, `bg-green-`, `bg-red-`
    
    def replacer(match):
        class_string = match.group(0)
        # Check if it has a solid colored background
        if re.search(r'bg-(indigo|rose|emerald|blue|green|red|purple)-[56789]00', class_string):
            return class_string # Leave it alone! It needs to be white.
        
        # Replace text-white with text-foreground, but preserve hover:text-white?
        # Actually hover:text-white on a secondary background should probably be hover:text-foreground in light mode too.
        # Let's replace `text-white` with `text-foreground` and `hover:text-white` with `hover:text-foreground`
        new_class_string = re.sub(r'(?<![a-zA-Z:-])text-white\b', 'text-foreground', class_string)
        new_class_string = re.sub(r'\bhover:text-white\b', 'hover:text-foreground', new_class_string)
        
        return new_class_string

    # Find all className="..." strings
    new_content = re.sub(r'className="([^"]*)"', replacer, content)
    # Also handle className={`...`} which might contain quotes or complex stuff.
    # It's safer to just do a second pass for `className={'...'}` and `className={\`...\`}`
    new_content = re.sub(r'className=\{`([^`]*)`\}', replacer, new_content)
    new_content = re.sub(r"className=\{'([^']*)'\}", replacer, new_content)
    
    if new_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    admin_dir = r"c:\Users\sambh\OneDrive\Desktop\Scholar ai\frontend\src\app\(admin)"
    for root, dirs, files in os.walk(admin_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                process_file(os.path.join(root, file))
                
    components_dir = r"c:\Users\sambh\OneDrive\Desktop\Scholar ai\frontend\src\components\admin"
    if os.path.exists(components_dir):
        for root, dirs, files in os.walk(components_dir):
            for file in files:
                if file.endswith('.tsx') or file.endswith('.ts'):
                    process_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
