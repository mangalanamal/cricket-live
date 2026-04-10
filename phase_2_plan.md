# Cricket Live App — Phase 2 Architecture Update

## 1. Schema & Types Changes (`lib/types.ts`)
*   **Player Additions**: Added `isCaptain`, `isViceCaptain` flags.
*   **Tournament Additions**:
    *   `sponsors[]`: List of sponsor names/logos.
    *   `stages[]`: E.g., 'Group Stage', 'Super 8', 'Semi Final', 'Final'.
    *   `groups[]`: E.g., 'Group A', 'Group B', mapping to team IDs.
*   **Match Additions**:
    *   `stage?`: The stage of the tournament.
    *   `group?`: If it's a group stage match.
    *   `playingXI_1`, `playingXI_2`: To select exact 11 players before match.
    *   `isDraft?`: Allows creating "TBD vs TBD" matches beforehand.

## 2. Admin Capabilities
*   **Tournament Admin**: Expand form to add Sponsors, Groups (and assign teams to them), and Stages.
*   **Match Admin**: Allow creating draft matches (e.g., Selecting "Winner of Semi 1" instead of a strict team). Allow selecting Playing XI before match starts.

## 3. Public Viewer & Formulas
*   **Net Run Rate (NRR) & Points Table**: A dedicated tab in the Tournament page calculating Points, Wins, Losses, NRR for each group.
*   **Team of the Tournament**: An algorithm running on the Stats page that picks the top 1 Wicket Keeper, top 4-5 Batsmen, top 1-2 All-rounders, and top 4 Bowlers based on tournament stats.
*   **Sponsor Display**: Inject sponsor marquees or banners between live score updates.
*   **Social Sharing**: Add native "Share" buttons to match pages leveraging the Web Share API and OpenGraph meta tags.

## 4. Suggested "Pro" Upgrades (My Recommendations)
For a highly professional, real-world application, consider adding:
1.  **DLS (Duckworth-Lewis-Stern) Engine**: For rain-interrupted matches (I can implement a basic Par Score calculator).
2.  **Fallback Commentary System**: Auto-generate text like "Full length delivery, driven beautifully for 4!"
3.  **Wagon Wheels / Pitch Maps**: A deeper scorer panel where scorers tap *where* the ball was hit.
4.  **Push Notifications**: Firebase Cloud Messaging for wicket/boundary alerts.
