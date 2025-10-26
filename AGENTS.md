# Priority Rules (override default if there is a duplicate)

[language]
rule = "WHEN A USER ASKS IN A LANGUAGE OTHER THAN ENGLISH, PLEASE REITERATE THE USER'S REQUEST IN YOUR UNDERSTANDING IN ENGLISH BEFORE STARTING TO DO THE REQUEST. ALWAYS THINK, ANSWER, PERFORM IN ENGLISH."

[core_principles]
code_usage = "Don't write code without using it; ensure everything written is utilized in the project."
readability_first = "Code must prioritize readability for human understanding over computer execution efficiency. Maintain long-term maintainability over short-term optimization."
data_structures_first = "Understand and design proper data structures first - good data structures lead to good code."
simplicity = "Avoid unnecessary complexity - implement simple solutions unless complexity is truly required. Avoid over-engineering - focus on delivering the minimal viable solution."
linus_principles = "New code is garbage if it doesn't follow Linus Torvalds' clean code principles: Keep it simple and obvious; Make code readable like good prose; Avoid premature optimization; Write code that clearly expresses intent; Minimize abstraction layers; Never add functionality 'just in case' - only implement what's needed now; Good taste means knowing when to stop adding features and complexity."

[comments]
self_documenting_first = "Write SELF-DOCUMENTING code with clear variable names, function names, and structure. Code should be readable without comments."
when_to_comment = "ONLY add comments for: 1) Complex business logic that cannot be simplified, 2) Non-obvious algorithmic decisions, 3) Important 'why' explanations (trade-offs, constraints, workarounds). DO NOT comment on 'how' - the code itself should explain how it works."
minimal = "Avoid over-commenting - excessive comments indicate poor code quality. If you need many comments to explain code, refactor the code to be more self-explanatory instead."
no_redundant_comments = "NEVER write comments that simply restate what the code does. Comments must add information that cannot be expressed in code."

[workflow]
step_1_understand = "Before implementation, use provided tools to understand the data structure of the request."
step_2_testing = "Only create automated tests if explicitly required in the original requirements."
step_3_define_structures = "Define all data input/output structures first before writing any logic."
step_4_define_signatures = "Define all function input parameters and return values before implementation."
step_5_define_functions = "Define all required functions and their signatures at once before writing implementation logic."
step_6_implement = "Implementation logic should be written only after all data structures and function definitions are complete."

[output_discipline]
no_unnecessary_docs = "DO NOT create markdown documentation files, summary files, guide files, or explanation files unless EXPLICITLY requested by the user."
code_focused = "Focus only on the code changes requested. Keep responses concise and code-focused."
no_readme_spam = "DO NOT generate README.md, GUIDE.md, SUMMARY.md, CHANGELOG.md, INSTRUCTIONS.md, or similar documentation files automatically."
no_post_task_summaries = "DO NOT create comprehensive summary documents, completion reports, or documentation files after completing tasks."
functional_files_only = "ONLY create files that are directly required for the functionality being implemented (source code, configuration files, tests if requested)."
no_example_files = "DO NOT automatically create example files (example.js, example.ts, demo.*, sample.*, etc.) unless EXPLICITLY requested by the user. Example files are only created when the user specifically asks for examples or demonstrations."

# TypeScript Project Rules

[linting]
command = "ALWAYS run `bun run lint` at root directory after writing code to ensure code quality."
linter = "Linter: biome. NEVER run --unsafe, manually fix all errors."

