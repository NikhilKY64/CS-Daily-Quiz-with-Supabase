# CS Daily Quiz with Supabase

A modern web app for daily computer science quizzes, built with [Next.js](https://nextjs.org) and [Supabase](https://supabase.com).

---

## 🚧 Note

This app is **under development**. You may encounter bugs or incomplete features.

---

## 🚀 Getting Started

**Method 1: Local Development**

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Environment Variables

Create a `.env.local` file in the project root with your Supabase values:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Configure Supabase Auth (Google/GitHub)

1) In Supabase Dashboard → Auth → URL configuration:
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000`

2) Providers → enable Google and GitHub and set credentials:
- Google: Client ID and Client Secret
- GitHub: Client ID and Client Secret

3) No extra callback path is needed; Supabase manages the OAuth flow and returns to your Site/Redirect URL.

**Method 2: Deploy on Vercel**

- Use the link in [`To open app/App_Domain`](./To%20open%20app/App_Domain) for direct deployment.
- Or [deploy on Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme).

---

## ✨ Features

- Daily computer science quizzes
- Supabase backend integration
- Modern UI with Geist font
- Built with Next.js
- Email/password auth and Google/GitHub OAuth buttons

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub](https://github.com/vercel/next.js)

---

> Made with ❤️ using [Next.js](https://nextjs.org) and [Supabase](https://supabase.com)
