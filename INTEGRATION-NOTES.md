# Incognito Brutalist Frontend Overlay

This archive is a **frontend-only overlay** for the existing `D:\Incognito-Team-Repo` project.

## Apply

1. Stop `npm run dev`.
2. Extract this ZIP into the repository root (`D:\Incognito-Team-Repo`) and allow files under `client\` to be overwritten.
3. Do not copy or replace `server\.env`; it contains local secrets and must stay untracked.
4. From the repository root, run:

   ```powershell
   npm run build
   npm test
   ```

5. Start the app again with `npm run dev` and smoke-test Submit Report, duplicate rejection, dashboard threshold suppression, and moderator authentication.

The submission page retains the chain-aware topic resolution and proof/submit logic expected by the current blockchain integration. The dashboard was adjusted so scopes below the minimum contributor threshold do not expose counts in charts or labels. The security page's interactive nullifier toy is explicitly labeled as illustrative, not a real Semaphore cryptographic value. The moderator token is no longer hard-coded into frontend source.

This overlay does not include or alter backend, blockchain contract, deployment, `.env`, or chain configuration files.
