# Branching Strategy

## Branch Overview

This project follows a structured branching strategy to ensure that all changes are properly integrated and validated before reaching the `main` branch.

## Branch Flow

```
backend  ──┐
            ├──> infrastructure ──> main
frontend ──┘
```

## Branch Descriptions

| Branch           | Description                                                                 |
|------------------|-----------------------------------------------------------------------------|
| `main`           | The stable production branch. Only receives merges from `infrastructure`.   |
| `infrastructure` | Integration branch. Receives merges from `backend` and `frontend`.          |
| `backend`        | Contains all backend (Spring Boot) source code and changes.                 |
| `frontend`       | Contains all frontend (Next.js) source code and changes.                    |

## Merge Rules

1. **`backend` → `infrastructure`**
   - Backend changes must be merged into `infrastructure` first.
   - Direct merges from `backend` to `main` are **not allowed**.

2. **`frontend` → `infrastructure`**
   - Frontend changes must be merged into `infrastructure` first.
   - Direct merges from `frontend` to `main` are **not allowed**.

3. **`infrastructure` → `main`**
   - Once both backend and frontend changes are integrated and verified in `infrastructure`, `infrastructure` is merged into `main`.

## Workflow Summary

1. Develop features or fixes in `backend` or `frontend`.
2. Merge `backend` and/or `frontend` into `infrastructure`.
3. Verify the integrated system in `infrastructure`.
4. Merge `infrastructure` into `main` for production release.
