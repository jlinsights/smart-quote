```markdown
# smart-quote Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill provides guidance for contributing to the `smart-quote` TypeScript codebase. It covers established coding conventions, file organization, import/export patterns, and testing approaches. While no specific framework is detected, the repository maintains a consistent style and structure that ensures readability and maintainability.

## Coding Conventions

### File Naming
- **PascalCase** is used for file names.
  - Example: `SmartQuoteEngine.ts`, `QuoteParser.ts`

### Import Style
- **Alias imports** are preferred.
  - Example:
    ```typescript
    import { SmartQuoteEngine as Engine } from './SmartQuoteEngine';
    ```

### Export Style
- **Named exports** are used throughout the codebase.
  - Example:
    ```typescript
    export function parseQuote(input: string): Quote { ... }
    export { SmartQuoteEngine };
    ```

### Commit Patterns
- Commit messages are freeform (no enforced prefixes).
- Average commit message length is around 141 characters.

## Workflows

### Adding a New Feature
**Trigger:** When implementing a new capability or module  
**Command:** `/add-feature`

1. Create a new TypeScript file using PascalCase (e.g., `NewFeature.ts`).
2. Use named exports for any functions or classes.
3. Use alias imports if referencing other modules.
4. Write or update corresponding test files (`*.test.ts`).
5. Commit your changes with a descriptive message.

### Fixing a Bug
**Trigger:** When resolving a defect or issue  
**Command:** `/fix-bug`

1. Locate the relevant TypeScript file(s).
2. Apply the bug fix, maintaining code style conventions.
3. Update or add tests in the corresponding `*.test.ts` file.
4. Commit with a clear description of the fix.

### Running Tests
**Trigger:** To verify code correctness  
**Command:** `/run-tests`

1. Identify all test files matching the `*.test.*` pattern.
2. Use the project's test runner (framework unknown; check project docs or scripts).
3. Review test results and address any failures.

## Testing Patterns

- Test files follow the `*.test.*` naming convention (e.g., `SmartQuoteEngine.test.ts`).
- The specific testing framework is not detected; refer to project documentation or package.json for details.
- Tests are written alongside or near the code they verify.

**Example Test File:**
```typescript
import { parseQuote } from './QuoteParser';

describe('parseQuote', () => {
  it('should parse a simple quote', () => {
    const result = parseQuote('"Hello"');
    expect(result.text).toBe('Hello');
  });
});
```

## Commands

| Command      | Purpose                                 |
|--------------|-----------------------------------------|
| /add-feature | Scaffold and implement a new feature    |
| /fix-bug     | Apply and document a bug fix            |
| /run-tests   | Run all test suites                     |
```
