# Prob Demo

A Next.js-based betting application interacting with the Probable Markets API.

## Features

### 1. King & Crowd (`/king-crowd`)
-   **Markets View**: Main interface to view active prediction markets.
-   **Trading**: Users can place BUY/SELL orders on outcomes.
-   **Wallet Integration**: Connects via Wagmi/Viem.

### 2. Glaze (`/glaze`)
-   **Quick Bet Interface**: Simplified UI for "Bending the Knee" (Betting on LAL) or "Shorting Frauds" (Betting against teams ranked above LAL).
-   **Themed UI**: Lakers-themed styling and animations.

### 3. Battlefield (`/battlefield`)
-   **Leaderboard**: Shows top traders and market activity. (Placeholder for future development)

## Data Flow

### 1. Wallet Connection
-   Uses `Wagmi` for wallet connection.
-   Checks for Proxy Wallet existence upon connection (`src/lib/wallet.ts`).

### 2. API Authentication
-   **L1 Headers**: Signed by EOA (Ethereum Externally Owned Account) to create an API key.
-   **L2 Headers**: Signed by API Key (HMAC) for order placement and management.
-   **API Key Storage**: Stored in `localStorage` for session persistence.

### 3. Order Placement
1.  **Approval**: Checks if Proxy Wallet has approved Exchange contracts for USDT and CTF tokens.
2.  **Balance Check**: Verifies USDT balance in Proxy Wallet (or EOA if configured).
3.  **Signing**: Orders are signed using EIP-712.
4.  **Submission**: Signed orders are sent to the Probable Markets API.

## Project Structure

-   `src/app`: Page routes and layouts.
-   `src/components`: React components (atomic design).
    -   `cards`: Market display cards.
    -   `modals`: Trading and setup modals.
-   `src/lib`: Core logic.
    -   `api.ts`: API key management and headers.
    -   `wallet.ts`: Blockchain interactions (balances, approvals).
    -   `markets.ts`: Market fetching and parsing.
    -   `orders.ts`: Order creation and management.
-   `src/config`: Configuration constants (addresses, ABIs).
-   `src/types.ts`: Shared type definitions.

## Getting Started

1.  Install dependencies:
    ```bash
    bun install
    ```
2.  Run development server:
    ```bash
    bun run dev
    ```
3.  Build for production:
    ```bash
    bun run build
    ```
