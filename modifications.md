# Château254 — Planned Modifications

## 1. Custom Rider Map & Delivery Routing

**Goal:** Give riders a live map with their assigned deliveries and an optimized route.

- [ ] Integrate mapping library (Leaflet / Mapbox) into rider dashboard
- [ ] Plot rider's current location via browser geolocation API
- [ ] Plot drop-off points for assigned orders on the map
- [ ] Auto-calculate and display optimal delivery route between stops
- [ ] Show turn-by-turn navigation link (Open in Google Maps / Waze)
- [ ] Reorder stops based on proximity / traffic (OSRM or Google Directions API)
- [ ] Rider can manually reorder stops via drag-and-drop
- [ ] Track rider location server-side and store in `rider_locations` table
- [ ] Admin can see all active riders on a live map (fleet view)
- [ ] Geofence alert when rider is near drop-off point

---

## 2. Real-Time Updates (WebSocket / SSE)

**Goal:** Eliminate page refreshes — orders, assignments, and status changes appear instantly for all connected users.

### Backend
- [ ] Add WebSocket server (Socket.IO or `ws`) alongside Express
- [ ] Create rooms/channels: `admin`, `rider:<id>`, `customer:<id>`
- [ ] Emit events on key actions:
  - `order:created` — new order placed by customer
  - `order:accepted` — admin accepts pending order
  - `order:cancelled` — admin rejects/cancels order
  - `order:assigned` — rider assigned to order
  - `order:status_changed` — preparing → out_for_delivery → completed
  - `order:completed` — delivery finished
  - `rider:status_changed` — rider goes online/offline
  - `customer:points_updated` — loyalty points awarded
- [ ] Persist events for offline clients (last-N-events replay on reconnect)

### Frontend — Admin Dashboard
- [ ] Connect to WebSocket on mount
- [ ] New orders appear in the queue without refresh
- [ ] Order status updates reflect live across tabs (Dashboard, Orders)
- [ ] Rider online/offline status updates live
- [ ] Stats (today's orders, sales) update in real-time
- [ ] Toast/notification when new order arrives

### Frontend — Rider Dashboard
- [ ] Connect to WebSocket on mount (join `rider:<id>` room)
- [ ] New assigned orders appear instantly
- [ ] Status changes from admin (e.g. order cancelled) reflected live
- [ ] Delivery count updates without refresh

### Frontend — Customer (Tracking Page)
- [ ] Connect to WebSocket on mount (join `customer:<id>` room)
- [ ] Order status updates live on tracking page
- [ ] Rider assigned notification
- [ ] Delivery completed notification

---

## 3. Other Future Enhancements

- [ ] Push notifications (browser or mobile) for order updates
- [ ] SMS/WhatsApp integration for delivery notifications
- [ ] Payment integration (M-Pesa, card payments)
- [ ] Rider earnings dashboard with daily/weekly summaries
- [ ] Customer rating & feedback for deliveries
- [ ] Admin analytics dashboard with charts (sales trends, peak hours)
- [ ] Inventory management — auto-disable items when stock runs out
- [ ] Promo codes & discount management
- [ ] Multi-language support (EN, SW)
