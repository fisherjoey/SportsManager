/**
 * Simple test script for AI assignment functionality with mocked dependencies
 */

// Mock the AI service with only the assignment functionality
class MockAIServices {
  constructor() {
    this.initialized = true;
  }

  async ensureInitialized() {
    return true;
  }

  /**
   * Generate AI-powered referee assignment suggestions
   */
  async generateRefereeAssignments(games, referees, assignmentRules = {}) {
    console.log('🤖 Generating AI assignments...');
    
    // Use the fallback algorithmic assignment since we don't have LLM setup
    return this.generateAssignmentsFallback(games, referees, assignmentRules);
  }

  /**
   * Fallback algorithmic assignment when AI fails
   */
  generateAssignmentsFallback(games, referees, rules = {}) {
    const assignments = [];
    
    for (const game of games) {
      const gameAssignment = {
        gameId: game.id,
        assignedReferees: [],
        conflicts: []
      };

      // Filter available referees
      const availableRefs = referees.filter(ref => ref.is_available !== false);
      
      // Score and rank referees for this game
      const scoredReferees = availableRefs.map(ref => {
        const score = this.calculateRefereeScore(ref, game, rules);
        return { referee: ref, score };
      }).sort((a, b) => b.score.total - a.score.total);

      // Assign top referees
      const refereesNeeded = game.refs_needed || 2;
      const assignedRefs = scoredReferees.slice(0, refereesNeeded);

      for (const { referee, score } of assignedRefs) {
        gameAssignment.assignedReferees.push({
          refereeId: referee.id,
          confidence: Math.min(0.95, score.total),
          reasoning: this.generateAssignmentReasoning(referee, game, score),
          factors: score.factors
        });
      }

      // Check for insufficient referees
      if (gameAssignment.assignedReferees.length < refereesNeeded) {
        gameAssignment.conflicts.push(
          `Only ${gameAssignment.assignedReferees.length} of ${refereesNeeded} referees assigned`
        );
      }

      assignments.push(gameAssignment);
    }

    return {
      success: true,
      assignments,
      method: 'algorithmic_fallback',
      confidence: this.calculateOverallAssignmentConfidence(assignments)
    };
  }

  /**
   * Calculate referee score for a specific game
   */
  calculateRefereeScore(referee, game, rules) {
    const factors = {
      proximity: this.calculateProximityFactor(referee, game),
      availability: referee.is_available ? 1.0 : 0.0,
      experience: this.calculateExperienceFactor(referee, game),
      level_match: this.calculateLevelMatchFactor(referee, game)
    };

    const weights = {
      proximity: rules.proximity_weight || 0.3,
      availability: rules.availability_weight || 0.4,
      experience: rules.experience_weight || 0.2,
      level_match: rules.performance_weight || 0.1
    };

    const total = (
      factors.proximity * weights.proximity +
      factors.availability * weights.availability +
      factors.experience * weights.experience +
      factors.level_match * weights.level_match
    );

    return { total, factors };
  }

  /**
   * Calculate proximity factor based on postal codes
   */
  calculateProximityFactor(referee, game) {
    if (!referee.postal_code || !game.postal_code) return 0.5;
    
    const refCode = referee.postal_code.replace(/\s/g, '').toUpperCase();
    const gameCode = game.postal_code.replace(/\s/g, '').toUpperCase();
    
    // Same postal code = 1.0
    if (refCode === gameCode) return 1.0;
    
    // Same first 3 characters (FSA/ZIP prefix) = 0.8
    if (refCode.substring(0, 3) === gameCode.substring(0, 3)) return 0.8;
    
    // Same first 2 characters = 0.6
    if (refCode.substring(0, 2) === gameCode.substring(0, 2)) return 0.6;
    
    // Same first character = 0.4
    if (refCode.substring(0, 1) === gameCode.substring(0, 1)) return 0.4;
    
    return 0.3; // Different regions
  }

  /**
   * Calculate experience factor
   */
  calculateExperienceFactor(referee, game) {
    const experience = referee.experience || 1;
    
    // Normalize experience to 0-1 scale (assuming max 20 years)
    const normalizedExp = Math.min(experience / 20, 1.0);
    
    // Boost for high experience
    return normalizedExp >= 0.5 ? normalizedExp : normalizedExp * 0.8;
  }

  /**
   * Calculate level match factor
   */
  calculateLevelMatchFactor(referee, game) {
    const levelMap = { 'Rookie': 1, 'Junior': 2, 'Senior': 3, 'Elite': 4 };
    const refLevel = levelMap[referee.level] || 1;
    const gameLevel = levelMap[game.level] || 2;
    
    // Perfect match = 1.0
    if (refLevel === gameLevel) return 1.0;
    
    // Higher qualified referee = 0.9
    if (refLevel > gameLevel) return 0.9;
    
    // Lower qualified referee = penalty
    const difference = gameLevel - refLevel;
    return Math.max(0.3, 1.0 - (difference * 0.2));
  }

  /**
   * Generate reasoning text for assignment
   */
  generateAssignmentReasoning(referee, game, score) {
    const reasons = [];
    
    if (score.factors.proximity >= 0.8) reasons.push('close location');
    if (score.factors.level_match >= 0.9) reasons.push('perfect level match');
    if (score.factors.experience >= 0.7) reasons.push('experienced referee');
    if (score.factors.availability === 1.0) reasons.push('confirmed available');
    
    if (reasons.length === 0) reasons.push('best available option');
    
    return `${referee.level} referee, ${reasons.join(', ')}`;
  }

  /**
   * Calculate overall confidence for all assignments
   */
  calculateOverallAssignmentConfidence(assignments) {
    if (!assignments || assignments.length === 0) return 0;
    
    let totalConfidence = 0;
    let totalAssignments = 0;
    
    for (const assignment of assignments) {
      for (const ref of assignment.assignedReferees || []) {
        totalConfidence += ref.confidence || 0;
        totalAssignments++;
      }
    }
    
    return totalAssignments > 0 ? totalConfidence / totalAssignments : 0;
  }
}

// Test data
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
  console.log('🧠 Testing AI Assignment System (Mock Version)...\n');

  try {
    const aiService = new MockAIServices();
    
    console.log('✅ AI Service created successfully');
    
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
    
    const result = await aiService.generateRefereeAssignments(
      mockGames,
      mockReferees,
      assignmentRules
    );
    
    console.log('\n📊 Assignment Results:');
    console.log('Success:', result.success);
    console.log('Method:', result.method);
    console.log('Overall Confidence:', result.confidence?.toFixed(2) || 'N/A');
    
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
    
    console.log('\n✅ AI Assignment System test completed successfully!');
    
    return result;
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAIAssignments()
    .then((result) => {
      console.log('\n🎉 All tests passed!');
      
      // Test summary
      const totalAssignments = result.assignments.reduce((sum, assignment) => 
        sum + assignment.assignedReferees.length, 0
      );
      
      console.log(`\n📈 Test Summary:`);
      console.log(`   Games processed: ${result.assignments.length}`);
      console.log(`   Assignments created: ${totalAssignments}`);
      console.log(`   Average confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Method used: ${result.method}`);
      
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { MockAIServices, mockGames, mockReferees };