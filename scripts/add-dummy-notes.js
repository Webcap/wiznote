require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Helper to generate UUID
function generateUUID() {
  return crypto.randomUUID();
}

// Initialize Supabase with service role key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const START_NUMBER = 5;
const END_NUMBER = 14;
const EMAIL_DOMAIN = '@webcap.cc';

// Sample note templates with realistic content
const noteTemplates = [
  {
    title: "Meeting Notes - Project Kickoff",
    content: `# Project Kickoff Meeting

**Date**: ${new Date().toLocaleDateString()}
**Attendees**: Team leads, stakeholders

## Key Discussion Points
- Project timeline: Q1 2025 launch
- Budget allocation approved
- Resource requirements identified
- Risk assessment completed

## Action Items
1. Setup development environment
2. Create project roadmap
3. Schedule weekly standups
4. Define success metrics

## Next Steps
Follow up meeting scheduled for next week to review initial progress.`,
    tags: ["meetings", "project", "planning"],
    isPinned: false
  },
  {
    title: "JavaScript Best Practices",
    content: `# JavaScript Best Practices

## Code Quality
- Use const and let instead of var
- Implement proper error handling with try-catch
- Write descriptive variable names
- Keep functions small and focused

## Modern ES6+ Features
- Arrow functions for cleaner syntax
- Destructuring for object/array manipulation
- Template literals for string interpolation
- Async/await for promise handling

## Testing
- Write unit tests for critical functions
- Aim for at least 80% code coverage
- Use meaningful test descriptions
- Mock external dependencies

Remember: Clean code is not written by following a set of rules. Clean code is written by applying discipline and caring about your craft.`,
    tags: ["javascript", "programming", "best-practices"],
    isPinned: true
  },
  {
    title: "Recipe: Pasta Carbonara",
    content: `# Authentic Pasta Carbonara

## Ingredients (Serves 4)
- 400g spaghetti
- 200g guanciale or pancetta
- 4 large eggs
- 100g Pecorino Romano cheese
- Black pepper
- Salt

## Instructions
1. Cook pasta in salted boiling water until al dente
2. Cut guanciale into small strips and fry until crispy
3. Mix eggs with grated cheese and black pepper
4. Drain pasta, reserve 1 cup pasta water
5. Combine hot pasta with guanciale
6. Remove from heat, add egg mixture, stirring quickly
7. Add pasta water to reach desired consistency

Serve immediately with extra cheese and black pepper. Buon appetito! 🍝`,
    tags: ["recipe", "cooking", "italian"],
    isPinned: false
  },
  {
    title: "Book Notes: Atomic Habits",
    content: `# Atomic Habits by James Clear

## Key Concepts

### The Four Laws of Behavior Change
1. Make it Obvious (Cue)
2. Make it Attractive (Craving)
3. Make it Easy (Response)
4. Make it Satisfying (Reward)

### The 1% Rule
Small improvements compound over time. Getting 1% better each day results in being 37x better after one year.

### Identity-Based Habits
Focus on who you wish to become, not what you want to achieve. Every action is a vote for the type of person you want to become.

### Environment Design
Make good habits obvious and bad habits invisible. Your environment shapes your behavior more than motivation.

### Habit Stacking
Pair new habits with existing ones: "After I [CURRENT HABIT], I will [NEW HABIT]"

## Personal Takeaways
- Start with tiny habits (2-minute rule)
- Focus on systems, not goals
- Never miss twice
- Track your habits visually`,
    tags: ["books", "productivity", "self-improvement"],
    isPinned: true
  },
  {
    title: "Travel Plans: Japan 2025",
    content: `# Japan Trip Planning

## Itinerary (14 Days)

### Tokyo (5 days)
- Shibuya Crossing & Shopping
- TeamLab Borderless
- Senso-ji Temple
- Tsukiji Market
- Tokyo Skytree

### Kyoto (4 days)
- Fushimi Inari Shrine
- Arashiyama Bamboo Grove
- Kinkaku-ji (Golden Pavilion)
- Gion District

### Osaka (3 days)
- Osaka Castle
- Dotonbori Street Food
- Universal Studios Japan

### Nara (1 day)
- Nara Park & Deer
- Todai-ji Temple

### Hakone (1 day)
- Hot springs
- Mount Fuji views

## Budget Estimate
- Flights: $1,200
- Accommodation: $1,500
- JR Pass: $350
- Food & Activities: $1,000
**Total: ~$4,050**

## Things to Remember
- Get JR Pass before departure
- Download Google Translate
- Bring cash (many places don't take cards)
- Reserve teamLab tickets online`,
    tags: ["travel", "japan", "planning"],
    isPinned: false
  },
  {
    title: "Workout Routine",
    content: `# Weekly Workout Plan

## Monday - Upper Body
- Bench Press: 4x8
- Pull-ups: 4x10
- Overhead Press: 3x10
- Rows: 3x12
- Bicep Curls: 3x12
- Tricep Extensions: 3x12

## Tuesday - Cardio
- 5K run or 30min cycling
- Core work: Planks, Russian twists

## Wednesday - Lower Body
- Squats: 4x8
- Deadlifts: 4x6
- Lunges: 3x12 each leg
- Leg Press: 3x15
- Calf Raises: 4x20

## Thursday - Rest or Yoga

## Friday - Full Body
- Circuit training
- HIIT workout

## Weekend - Active Recovery
- Swimming, hiking, or sports

Remember: Progressive overload is key!`,
    tags: ["fitness", "health", "workout"],
    isPinned: false
  },
  {
    title: "Learning React - Notes",
    content: `# React Learning Path

## Core Concepts
- JSX syntax and components
- Props and state management
- Lifecycle methods & hooks
- Event handling
- Conditional rendering
- Lists and keys

## Essential Hooks
\`\`\`javascript
// useState - state management
const [count, setCount] = useState(0);

// useEffect - side effects
useEffect(() => {
  // runs after render
  return () => {
    // cleanup
  };
}, [dependencies]);

// useContext - context API
const value = useContext(MyContext);

// useReducer - complex state logic
const [state, dispatch] = useReducer(reducer, initialState);
\`\`\`

## Best Practices
- Keep components small and focused
- Use functional components with hooks
- Implement proper error boundaries
- Optimize with React.memo and useMemo
- Use proper key props in lists

## Resources
- Official React docs
- React Beta docs (new)
- Kent C. Dodds blog
- Josh Comeau tutorials`,
    tags: ["react", "javascript", "webdev"],
    isPinned: true
  },
  {
    title: "Garden Planning",
    content: `# Spring Garden 2025

## Vegetables to Plant
- Tomatoes (Cherry, Beefsteak)
- Bell Peppers (Red, Yellow)
- Cucumbers
- Zucchini
- Lettuce varieties
- Herbs (Basil, Cilantro, Parsley)

## Timeline
- March: Start seeds indoors
- April: Transplant hardier plants
- May: Plant remaining seedlings
- June-Sept: Harvest season

## Garden Layout
- Sunny area: Tomatoes, peppers
- Partial shade: Lettuce, herbs
- Vertical: Cucumbers on trellis

## Maintenance Notes
- Water deeply 2-3x per week
- Mulch to retain moisture
- Check for pests weekly
- Feed with compost monthly`,
    tags: ["gardening", "hobby", "outdoor"],
    isPinned: false
  },
  {
    title: "Investment Strategy",
    content: `# Investment Portfolio Strategy

## Asset Allocation (Moderate Risk)
- 60% Stocks (Index Funds)
- 25% Bonds
- 10% Real Estate (REITs)
- 5% Cash/Emergency Fund

## Monthly Investment Plan
- Contribute $500 to 401k
- $300 to Roth IRA
- $200 to brokerage account

## Long-term Goals
- Retirement at 60
- Buy investment property
- Build 6-month emergency fund
- Save for kids' education

## Key Principles
- Dollar-cost averaging
- Diversification across sectors
- Rebalance quarterly
- Stay invested for long term
- Don't panic sell during downturns

**Disclaimer**: This is personal planning, not financial advice. Consult a professional advisor.`,
    tags: ["finance", "investing", "planning"],
    isPinned: false
  },
  {
    title: "Quick Ideas & Thoughts",
    content: `# Random Ideas & Thoughts

## App Ideas
- Habit tracker with AI insights
- Recipe organizer with meal planning
- Local event discovery app
- Study group matcher for students

## Things to Learn
- TypeScript advanced patterns
- Docker & Kubernetes
- System design principles
- GraphQL

## Side Project Ideas
- Personal finance dashboard
- Automated plant watering system
- Smart home automation
- Voice-controlled task manager

## Creative Projects
- Start a tech blog
- Create YouTube tutorials
- Build open source library
- Write technical ebook

## Weekend Projects
- Organize home office
- Build raised garden beds
- Create photo album
- Learn new recipe`,
    tags: ["ideas", "brainstorm", "projects"],
    isPinned: false
  }
];

async function addDummyNotes() {
  console.log('📝 Adding dummy notes to test accounts...\n');
  
  const results = {
    totalNotes: 0,
    userResults: []
  };

  // Get all test users
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing users:', listError);
    return;
  }

  // Filter for test users
  for (let i = START_NUMBER; i <= END_NUMBER; i++) {
    const email = `test.${i}${EMAIL_DOMAIN}`;
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log(`⚠️  User not found: ${email}`);
      continue;
    }

    console.log(`\n👤 Creating notes for ${email}...`);
    
    const userNotes = [];
    const notesToCreate = Math.floor(Math.random() * 3) + 5; // 5-7 notes per user
    
    for (let j = 0; j < notesToCreate; j++) {
      const template = noteTemplates[j % noteTemplates.length];
      
      // Add some variation to the title
      const noteTitle = `${template.title}${j >= noteTemplates.length ? ` (${Math.floor(j / noteTemplates.length) + 1})` : ''}`;
      
      const note = {
        id: generateUUID(),
        user_id: user.id,
        title: noteTitle,
        content: template.content,
        tags: template.tags,
        is_pinned: template.isPinned && j === 0, // Only pin first note
        is_archived: false,
        is_favorite: Math.random() > 0.7, // 30% chance of being favorite
        created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(), // Random date within last 30 days
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('notes')
        .insert(note)
        .select();
      
      if (error) {
        console.error(`   ❌ Error creating note "${noteTitle}":`, error.message);
      } else {
        userNotes.push(noteTitle);
        results.totalNotes++;
      }
    }
    
    console.log(`   ✅ Created ${userNotes.length} notes`);
    userNotes.forEach(title => console.log(`      • ${title}`));
    
    results.userResults.push({
      email,
      notesCreated: userNotes.length
    });
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total notes created: ${results.totalNotes}`);
  console.log(`👥 Users processed: ${results.userResults.length}`);
  console.log('='.repeat(60));
  
  console.log('\n📋 BREAKDOWN BY USER:');
  results.userResults.forEach(({ email, notesCreated }) => {
    console.log(`   • ${email}: ${notesCreated} notes`);
  });

  console.log('\n✨ Done!\n');
}

addDummyNotes().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

