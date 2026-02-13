# Wizard Recommendations API Testing

## API Endpoint
`GET /api/learning/wizard-recommendations`

## Query Parameters
- `land_size`: One of: `balcony`, `small_yard`, `suburban`, `rural`, `farm`
- `experience`: One of: `beginner`, `intermediate`, `advanced`

## Test Cases

### Test 1: Suburban + Beginner
```bash
curl "http://localhost:3000/api/learning/wizard-recommendations?land_size=suburban&experience=beginner"
```

**Expected:** Suburban Homesteader (score: 90)
- 40 pts (land size match)
- 30 pts (experience match)
- 20 pts (beginner bonus)

### Test 2: Balcony + Beginner
```bash
curl "http://localhost:3000/api/learning/wizard-recommendations?land_size=balcony&experience=beginner"
```

**Expected:** Urban Food Producer (score: 90)
- 40 pts (land size match)
- 30 pts (experience match)
- 20 pts (beginner bonus)

### Test 3: Rural + Intermediate
```bash
curl "http://localhost:3000/api/learning/wizard-recommendations?land_size=rural&experience=intermediate"
```

**Expected:** Rural Regenerator (score: 70)
- 40 pts (land size match)
- 30 pts (experience match)

### Test 4: Farm + Intermediate
```bash
curl "http://localhost:3000/api/learning/wizard-recommendations?land_size=farm&experience=intermediate"
```

**Expected:** Small Farm Operator (score: 70)
- 40 pts (land size match)
- 30 pts (experience match)

### Test 5: Missing Parameters
```bash
curl "http://localhost:3000/api/learning/wizard-recommendations?land_size=suburban"
```

**Expected:** 400 Bad Request
```json
{
  "error": "Missing required parameters: land_size and experience"
}
```

## Response Format

```json
{
  "recommended": {
    "path": {
      "id": "suburban-homesteader",
      "name": "Suburban Homesteader",
      "slug": "suburban-homesteader",
      "description": "...",
      "target_audience": "...",
      "estimated_lessons": 20,
      "difficulty": "beginner",
      "icon_name": "home",
      "created_at": 1234567890
    },
    "matchScore": 90,
    "reasons": [
      "Designed for suburban lots (0.5-2 acres)",
      "Matches your beginner experience level"
    ]
  },
  "alternatives": [
    {
      "path": { /* ... */ },
      "matchScore": 60,
      "reasons": [ /* ... */ ]
    }
    // ... more alternatives
  ]
}
```

## Scoring Logic

### Land Size Matching (40 points max)
- `balcony` + `urban-food-producer` = 40 pts
- `small_yard` + `urban-food-producer` = 35 pts
- `suburban` + `suburban-homesteader` = 40 pts
- `rural` + `rural-regenerator` = 40 pts
- `farm` + `small-farm-operator` = 40 pts

### Experience Matching (30 points max)
- Experience matches path difficulty = 30 pts
- `beginner` experience + `beginner` path = additional 20 pts

### Path Bonuses (10 points)
- `permaculture-student` path = 10 pts (comprehensive fallback)
