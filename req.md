# EDSA — Educational Story Adventure (Backoffice & API)

## Overview

A backoffice system for managing student progress in a puzzle-based storybook game. The game itself is developed separately in another repository — this project covers only the **backend API** and **admin backoffice**.

## Game Concept

- The game is a puzzle game built around storybooks
- There can be many books, each with a different puzzle type
- Each book contains multiple pages; each page presents a puzzle based on the book's puzzle type

## Tech Stack

| Layer        | Technology                                          |
| ------------ | --------------------------------------------------- |
| Framework    | Next.js (fullstack)                                 |
| Database     | PostgreSQL (Docker locally, Supabase in production)  |
| UI Library   | Ant Design (antd)                                   |
| API Docs     | Swagger                                             |
| i18n         | English & Indonesian                                |

## Development & Deployment Strategy

- **Local dev:** PostgreSQL runs in a Docker container; the Next.js app runs natively (not dockerized)
- **Production:** Uses Supabase online PostgreSQL database
- **Makefile:** `make dev` starts the Postgres container and the Next.js dev server

## Roles & Permissions

| Role       | Access                                                                 |
| ---------- | ---------------------------------------------------------------------- |
| Superadmin | Full access to everything in the system                                |
| Teacher    | Access limited to assigned classes; can view student progress in those classes |
| Student    | Login only from the game app (no backoffice access)                    |

## User Management

- **Superadmin** credential is auto-generated on first run/deployment
- **Teacher** and **Student** accounts are created by Superadmin (no self-registration)
- The API must provide authentication endpoints for the game app (student login)

## Scope

- **In scope:** Backoffice UI + REST API (for both backoffice and game app)
- **Out of scope:** The game app itself (separate repo, separate team)

## Localization

Both the backoffice and the API responses should support **English** and **Indonesian**.
