# BFHL Hierarchy Inspector

Next.js submission for the SRM Full Stack Engineering Challenge.

## Routes

- `POST /bfhl` accepts `{ "data": ["A->B", "A->C"] }`.
- `/` provides a single-page UI for testing the API response.

## Local Development

```bash
bun install
cp .env.example .env
bun run dev
```

Set these values in `.env` and in Vercel project environment variables:

```bash
BFHL_USER_ID=fullname_ddmmyyyy
BFHL_EMAIL_ID=your.college.email@example.com
BFHL_COLLEGE_ROLL_NUMBER=YOUR_ROLL_NUMBER
```

## Verification

```bash
bun test
bun run lint
bun run build
```

## Deployment

Deploy the repository to Vercel. The submitted API base URL should be the Vercel
deployment URL, and the evaluator will call `<deployment-url>/bfhl`.
