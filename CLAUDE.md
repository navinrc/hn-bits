## Implementation

Guidelines for writing good code for a developer:

1. Choose clean code over clever code.
2. Write object oriented code as much as possible.
3. Keep function sizes small, ideally 10 lines.
4. Try and keep files between 100 and 300 lines.
5. Don't keep too many files in a folder or module. Try and keep it under 15.
6. Avoid abbreviations.
7. Use standard API as much as possible.
8. Reuse. Write as little code as possible.
9. Always write tests, and make sure they work.
10. Build the minimum working app, then iterate towards your goals.
12. Keep the verbosity less in new changes (comments etc). 
    Explain only what's absolutely needed in inline comments.
    Actual changes explanation can be part of commit message. 
13. Create a new branch before working on a new feature/spec (branch name patterns: feat/, fix/, just like conventional commit pre-fixes)
14. Reconcile the spec and log the progress after each phase of development
15. Commit after each meaningful phase
16. Commit the spec before the development commits
17. Use comments only when necessary to explain "why?" not "how?", how must be clear from the code itself

## Planning

For creating specs use tracer bullet approach.

> Tracer bullets comes from the Pragmatic Programmer. When building systems, you want to write code that gets you feedback as quickly as possible. Tracer bullets are small slices of functionality that go through all layers of the system, allowing you to test and validate your approach early. This helps in identifying potential issues and ensures that the overall architecture is sound before investing significant time in development.

Create specs in `specs/`. Maintain a `PROGRESS.md` file to track progress of implementation phases.
once the specific version of the app is complete and working capture it in both `specs/README.md` and `PROGRESS.md`

## Commit / PR

* Always use conventional commits
* Commit the spec before you begin
* Reconcile the specs after implementation


## Regression tests

* When we fix a bug, add at the very least a Unit test, and verify before/after by temp revert of fix to make sure the test tests what is intended