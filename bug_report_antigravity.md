# Bug Report: Agent Terminated Due to Error

**Reporter**: User  
**Date**: 2024-12-23  
**Product**: Antigravity IDE (Claude Integration)  
**Model(s) Tested**: Claude Sonnet, M8, M12

---

## Summary

The Claude agent repeatedly terminates with the error message:
> "Agent terminated due to error. You can prompt the model to try again or start a new conversation if the error persists."

This occurs in **new conversations** (not just long sessions) and is **project-directory specific**.

---

## Environment

- **OS**: Windows
- **IDE**: Antigravity
- **Working Project**: `C:\Users\miqba\projects\productivity-app` (Tauri 2.0 app)
- **Affected Projects**: Other project directories (specifics TBD)

---

## Steps to Reproduce

1. Open Antigravity IDE
2. Open a project directory **other than** `productivity-app`
3. Start a new conversation with Claude
4. Send any prompt
5. Agent terminates with error

---

## Expected Behavior

Claude agent should respond normally in any project directory, same as it does in the `productivity-app` workspace.

---

## Actual Behavior

- Works correctly in `productivity-app` directory
- Fails in other project directories
- Error occurs in **new chats** (not context overflow)
- Temporarily resolves after IDE restart, then fails again

---

## Possible Causes

1. **Workspace indexing** - Certain project structures may cause indexing failures
2. **Large files** - Some projects may contain files that exceed processing limits
3. **File types** - Specific file extensions or binary files may trigger errors
4. **Corrupted cache** - IDE may have cached problematic data for certain workspaces

---

## Suggested Investigation

1. Compare file structure between working (`productivity-app`) and non-working projects
2. Check for very large files (>1MB) in affected projects
3. Look for unusual file types (binaries, node_modules, etc.)
4. Clear Antigravity cache/workspace data for affected projects

---

## Workaround

- Reopen IDE (temporary fix)
- Use working project directory when possible

---

## Additional Notes

The user has tested multiple models (Sonnet → M8 → M12) and the issue persists, suggesting it's not model-specific but workspace/infrastructure related.
