# Testing Checklist

## Authentication
- [ ] User can register with email/password
- [ ] User can login
- [ ] User can logout
- [ ] Invalid credentials show error
- [ ] Session persists across page reloads

## Dashboard
- [ ] Empty state shows when no farms
- [ ] Farms list displays correctly
- [ ] New farm button navigates to creation flow

## Farm Creation
- [ ] Location picker shows map
- [ ] Clicking map sets marker
- [ ] Form validates required fields
- [ ] Farm creation redirects to editor

## Map Editor
- [ ] Map loads with correct center/zoom
- [ ] Drawing tools work (polygon)
- [ ] Delete tool removes zones
- [ ] Save persists zones to database
- [ ] Zones reload correctly
- [ ] Satellite toggle works

## AI Analysis
- [ ] Chat input accepts text
- [ ] Screenshot capture works
- [ ] AI response displays in chat
- [ ] Multiple queries maintain history
- [ ] Error handling for failed requests

## Gallery
- [ ] Public farms display
- [ ] Toggle public/private works
- [ ] Empty state shows appropriately
