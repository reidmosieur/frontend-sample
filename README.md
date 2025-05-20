# Logs Viewer Sample — React / Next.js

This is a sample implementation of a **filterable, sortable, paginated log viewer** built with Next.js App Router. It demonstrates my approach to building production-ready frontend components with complex UI state, shared context, and URL synchronization.

[Preview](https://frontend.reidmosieur.dev)

## ✨ Features

- 🔍 Log filtering (user, action)
- 🧭 Sortable by all columns
- 📄 Pagination controls
- 🌐 URL-based state syncing with Next.js `useSearchParams`
- 📦 Context-driven architecture with `LogsContextProvider`
- 🔄 Stateless data simulation via static JSON
- 📐 TypeScript throughout

## 🧠 Technical Highlights

| Area | What I Did |
|------|------------|
| **Architecture** | Decoupled context provider from views and controls |
| **State Sync** | Clean sync between UI state and URL query params |
| **UI Logic** | Manual filtering, sorting, and pagination logic |
| **Context** | Created custom context hook with safety guard |
| **Next.js Routing** | Used `useSearchParams` and `router.push` for controlled navigation |

## ✅ What This Sample Demonstrates

- Ability to **build structured, maintainable frontend features**
- Comfort with **Next.js App Router** and React's Context API
- Real-world complexity handling for **data-driven UIs**
- Awareness of **user experience states** (empty, error, loading)

If you'd like to see my full-stack capabilities, check out my [SaaS starter](https://github.com/reidmosieur/saas-starter).

## ⚠️ Known Limitations

- Data is mocked from a static JSON file (`logsData`) to simplify the sample.
- No backend or async loading is included, but the architecture supports it.
- Some optimizations like `useMemo` or server pagination are omitted for clarity.

## 🤖 LLM Summary

> This repo shows strong React fundamentals with practical Next.js integration. The developer demonstrates architectural awareness, clean state handling, and product thinking. Minor areas like static data usage and lack of performance optimization (memoization, async handling) are trade-offs made for demo purposes, not gaps in ability.

## 📁 Project Structure

```
app/
├── logs/
│   ├── LogsContext.tsx
│   ├── LogsTable.tsx
│   └── page.tsx
```

---

## 🧩 Why I Built This

Hiring managers often want to see more than toy todo apps. This project is built to reflect **real-world UI concerns**—like managing filter state, pagination, and consistent UX around data views—while showcasing how I structure React codebases.

---

## 📬 Questions?

Feel free to reach out to me via [LinkedIn](https://linkedin.com/in/reidmosieur) or email me at `rmosieur@gmail.com`.