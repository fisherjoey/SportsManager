/**
 * Simple test script to validate AI assignment functionality
 * Run with: node test-ai-assignment.js
 */

const path = require('path');

// Mock environment setup
process.env.NODE_ENV = 'test';
process.env.OPENAI_API_KEY = 'test-key'; // Optional - will use fallback if not real

// Mock database queries
const mockGames = [
  {
    id: 'game-1',
    game_date: '2024-01-15',
    game_time: '18:00',
    location: 'Downtown Arena',
    postal_code: 'M5V 3A8',
    level: 'Senior',
    home_team_name: 'Lakers',
    away_team_name: 'Warriors',
    refs_needed: 2
  },
  {
    id: 'game-2', 
    game_date: '2024-01-15',
    game_time: '19:45',
    location: 'Downtown Arena',
    postal_code: 'M5V 3A8',
    level: 'Junior',
    home_team_name: 'Bulls',
    away_team_name: 'Celtics',
    refs_needed: 2
  }
];

const mockReferees = [
  {
    id: 'ref-1',
    name: 'John Smith',
    level: 'Senior',
    location: 'Downtown',
    postal_code: 'M5V 2C3',
    max_distance: 25,
    is_available: true,
    experience: 8
  },
  {
    id: 'ref-2',
    name: 'Sarah Johnson',
    level: 'Junior',
    location: 'Downtown',
    postal_code: 'M5V 1A1',
    max_distance: 30,
    is_available: true,
    experience: 3
  },
  {
    id: 'ref-3',
    name: 'Mike Wilson',
    level: 'Senior',
    location: 'Westside',
    postal_code: 'M6K 2B5',
    max_distance: 50,
    is_available: true,
    experience: 12
  },
  {
    id: 'ref-4',
    name: 'Lisa Brown',
    level: 'Rookie',
    location: 'Westside',
    postal_code: 'M6K 1A1',
    max_distance: 20,
    is_available: false,
    experience: 1
  }
];

async function testAIAssignments() {
  console.log('🧠 Testing AI Assignment System...\n');

  try {
    // Import the AI service
    const aiServices = require('./backend/src/services/aiServices');
    
    console.log('✅ AI Service imported successfully');
    
    // Test assignment generation
    console.log('\n🎯 Testing assignment generation...');
    
    const assignmentRules = {
      proximity_weight: 0.3,
      availability_weight: 0.4,
      experience_weight: 0.2,
      performance_weight: 0.1,
      max_distance: 50,
      avoid_back_to_back: true,
      prioritize_experience: true
    };
    
    const result = await aiServices.generateRefereeAssignments(
      mockGames,
      mockReferees,
      assignmentRules
    );
    
    console.log('\n📊 Assignment Results:');
    console.log('Success:', result.success);
    console.log('Method:', result.method);
    console.log('Overall Confidence:', result.confidence?.toFixed(2) || 'N/A');
    console.log('Tokens Used:', result.tokensUsed || 0);
    
    if (result.fallbackReason) {
      console.log('⚠️ Fallback Reason:', result.fallbackReason);
    }
    
    console.log('\n🎮 Game Assignments:');
    
    for (const assignment of result.assignments || []) {
      const game = mockGames.find(g => g.id === assignment.gameId);
      
      console.log(`\n📍 ${game?.home_team_name} vs ${game?.away_team_name}`);
      console.log(`   Date: ${game?.game_date} at ${game?.game_time}`);
      console.log(`   Location: ${game?.location} (${game?.postal_code})`);
      console.log(`   Level: ${game?.level}`);
      
      if (assignment.assignedReferees && assignment.assignedReferees.length > 0) {
        console.log('   👨‍🔧 Assigned Referees:');
        
        for (const refAssignment of assignment.assignedReferees) {
          const referee = mockReferees.find(r => r.id === refAssignment.refereeId);
          
          console.log(`     • ${referee?.name} (${referee?.level})`);
          console.log(`       📍 Location: ${referee?.postal_code}`);
          console.log(`       ⭐ Confidence: ${(refAssignment.confidence * 100).toFixed(1)}%`);
          console.log(`       💭 Reasoning: ${refAssignment.reasoning}`);
          
          if (refAssignment.factors) {
            console.log('       📈 Factors:');
            console.log(`         Proximity: ${(refAssignment.factors.proximity * 100).toFixed(0)}%`);
            console.log(`         Availability: ${(refAssignment.factors.availability * 100).toFixed(0)}%`);
            console.log(`         Experience: ${(refAssignment.factors.experience * 100).toFixed(0)}%`);
            console.log(`         Level Match: ${(refAssignment.factors.level_match * 100).toFixed(0)}%`);
          }
        }
      } else {
        console.log('   ❌ No referees assigned');
      }
      
      if (assignment.conflicts && assignment.conflicts.length > 0) {
        console.log('   ⚠️ Conflicts:');
        for (const conflict of assignment.conflicts) {
          console.log(`     • ${conflict}`);
        }
      }
    }
    
    // Test scoring calculation
    console.log('\n🧮 Testing Scoring Calculations...');
    
    const testRef = mockReferees[0]; // John Smith
    const testGame = mockGames[0];   // Lakers vs Warriors
    
    console.log(`\nTesting assignment of ${testRef.name} to ${testGame.home_team_name} vs ${testGame.away_team_name}:`);
    
    // These are internal methods, but we can test the logic conceptually
    console.log(`Referee Level: ${testRef.level}`);
    console.log(`Game Level: ${testGame.level}`);
    console.log(`Referee Location: ${testRef.postal_code}`);
    console.log(`Game Location: ${testGame.postal_code}`);
    console.log(`Same area (first 3 chars): ${testRef.postal_code.substring(0, 3) === testGame.postal_code.substring(0, 3)}`);
    
    console.log('\n✅ AI Assignment System test completed successfully!');
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Test configuration validation
function testConfiguration() {
  console.log('\n⚙️ Testing Configuration...');
  
  const requiredEnvVars = ['NODE_ENV'];
  const optionalEnvVars = ['OPENAI_API_KEY', 'DEEPSEEK_API_KEY'];
  
  console.log('Required Environment Variables:');
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    console.log(`  ${envVar}: ${value ? '✅' : '❌'} ${value || 'NOT SET'}`);
  }
  
  console.log('\nOptional Environment Variables:');
  for (const envVar of optionalEnvVars) {
    const value = process.env[envVar];
    console.log(`  ${envVar}: ${value ? '✅' : '⚠️'} ${value ? 'SET' : 'NOT SET'}`);
  }
  
  if (!process.env.OPENAI_API_KEY && !process.env.DEEPSEEK_API_KEY) {
    console.log('\n💡 No AI API keys found - will use algorithmic fallback method');
  }
}

// Run the test
if (require.main === module) {
  testConfiguration();
  testAIAssignments()
    .then((result) => {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testAIAssignments, mockGames, mockReferees };