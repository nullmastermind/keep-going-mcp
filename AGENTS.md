# Priority Rules (override default if there is a duplicate)

[code_quality_standards.core_principles]
rule_1 = "DON'T write unused code - ensure everything written is utilized in the project"
rule_2 = "PRIORITIZE readability for human understanding over execution efficiency"
rule_3 = "MAINTAIN long-term maintainability over short-term optimization"
rule_4 = "AVOID unnecessary complexity - implement simple solutions unless complexity is truly required"
rule_5 = "FOLLOW Linus Torvalds' clean code principles: keep it simple, make code readable like prose, avoid premature optimization, express intent clearly, minimize abstraction layers"

[code_quality_standards.documentation_standards]
rule_1 = "Comments MUST explain 'what' (business logic/purpose) and 'why' (reasoning/decisions), NOT 'how'"
rule_2 = "AVOID over-commenting - excessive comments indicate poor code quality"
rule_3 = "Function comments MUST explain purpose and reasoning, placed at function beginnings"
rule_4 = "Well-written code should be self-explanatory through meaningful names and clear structure"

[code_quality_standards.development_process]
step_1 = "Understand first: Use available tools to understand data structures before implementation"
step_2 = "Design data structures: Good data structures lead to good code"
step_3 = "Define interfaces: Specify all input/output structures before writing logic"
step_4 = "Define functions: Create all function signatures before implementation"
step_5 = "Implement logic: Write implementation only after structures and definitions are complete"

[code_quality_standards.quality_guidelines]
rule_1 = "AVOID over-engineering - focus on minimal viable solutions meeting acceptance criteria"
rule_2 = "ONLY create automated tests if explicitly required"
rule_3 = "NEVER add functionality 'just in case' - implement only what's needed now"

[decision_making_framework]
description = "Apply these principles systematically"
principle_1 = "Gather Complete Information"
principle_2 = "Multi-Perspective Analysis"
principle_3 = "Consider All Stakeholders"
principle_4 = "Evaluate Alternatives"
principle_5 = "Assess Impact & Consequences"
principle_6 = "Apply Ethical Framework"
principle_7 = "Take Responsibility"
principle_8 = "Learn & Adapt"

[typescript_development]
rule_1 = "ALWAYS run 'bun run lint' and 'bun run typecheck' at root directory after writing code to ensure code quality"
rule_2 = "Linter: biome. NEVER run --unsafe, manually fix all errors"
