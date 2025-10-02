<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { socketStore } from '$lib/socket';
  import type { QuestionPayload, QuestionRevealPayload, ScoreUpdatePayload } from '@jaysgame/shared';

  let matchId = '';
  let playerId = '';
  let currentQuestion: QuestionPayload | null = null;
  let selectedAnswer: string = '';
  let hasSubmitted = false;
  let timeRemaining = 0;
  let timerInterval: number | null = null;
  let showReveal = false;
  let revealData: QuestionRevealPayload | null = null;
  let leaderboard: ScoreUpdatePayload['leaderboard'] = [];
  let lineScore: ScoreUpdatePayload['lineScore'] = [];
  let clientLatency = 0;

  // Reactions & Heckles
  let reactions: Array<{ id: string; emoji: string; x: number; y: number; timestamp: number }> = [];
  let lastReactionTime = 0;
  let reactionThrottle = 1000; // 1 second between reactions
  let currentHeckle: string | null = null;
  let heckleTimeout: number | null = null;

  $: matchState = $socketStore.matchState;
  $: socket = $socketStore.socket;
  $: connected = $socketStore.connected;

  // Calculate time remaining
  $: if (matchState && matchState.endsAt) {
    const remaining = Math.max(0, Math.ceil((matchState.endsAt - Date.now()) / 1000));
    timeRemaining = remaining;
  } else {
    timeRemaining = 0;
  }

  // Navigate to postgame when match ends
  $: if (matchState && matchState.phase === 'postgame') {
    goto(`/postgame?match=${matchId}&player=${playerId}`);
  }

  onMount(() => {
    // Get parameters from URL
    const params = new URLSearchParams(window.location.search);
    matchId = params.get('match') || '';
    playerId = params.get('player') || '';

    if (!matchId || !playerId) {
      console.error('Missing match or player ID');
      goto('/join');
      return;
    }

    // Measure client latency
    const start = Date.now();
    clientLatency = 10; // Default 10ms, will be measured on first request

    // Set up socket listeners
    if (socket) {
      socket.on('question:show', handleQuestionShow);
      socket.on('question:reveal', handleQuestionReveal);
      socket.on('score:update', handleScoreUpdate);
      socket.on('answer:submit:success', handleAnswerSuccess);
      socket.on('answer:submit:error', handleAnswerError);
      socket.on('stretch:start', handleStretchStart);
      socket.on('reaction:broadcast', handleReactionBroadcast);
      socket.on('heckle:show', handleHeckleShow);
    }

    // Start timer countdown
    startTimerCountdown();
  });

  onDestroy(() => {
    if (socket) {
      socket.off('question:show');
      socket.off('question:reveal');
      socket.off('score:update');
      socket.off('answer:submit:success');
      socket.off('answer:submit:error');
      socket.off('stretch:start');
      socket.off('reaction:broadcast');
      socket.off('heckle:show');
    }

    if (timerInterval) {
      clearInterval(timerInterval);
    }

    if (heckleTimeout) {
      clearTimeout(heckleTimeout);
    }
  });

  function startTimerCountdown() {
    if (timerInterval) {
      clearInterval(timerInterval);
    }

    timerInterval = window.setInterval(() => {
      if (matchState && matchState.endsAt) {
        const remaining = Math.max(0, Math.ceil((matchState.endsAt - Date.now()) / 1000));
        timeRemaining = remaining;

        // Auto-submit empty answer when time runs out
        if (remaining === 0 && !hasSubmitted && currentQuestion) {
          console.log('Time expired, auto-submitting empty answer');
        }
      }
    }, 100);
  }

  function handleQuestionShow(data: { question: QuestionPayload; endsAt: number }) {
    console.log('New question:', data.question);
    currentQuestion = data.question;
    selectedAnswer = '';
    hasSubmitted = false;
    showReveal = false;
    revealData = null;
    timeRemaining = Math.ceil((data.endsAt - Date.now()) / 1000);
  }

  function handleQuestionReveal(data: QuestionRevealPayload) {
    console.log('Question revealed:', data);
    showReveal = true;
    revealData = data;
  }

  function handleScoreUpdate(data: ScoreUpdatePayload) {
    console.log('Score update:', data);
    leaderboard = data.leaderboard;
    lineScore = data.lineScore;
  }

  function handleAnswerSuccess(data: { questionId: string; submitted: boolean }) {
    console.log('Answer submitted successfully');
    hasSubmitted = true;
  }

  function handleAnswerError(data: { error: string }) {
    console.error('Answer submission error:', data.error);
    alert(`Error: ${data.error}`);
    hasSubmitted = false;
  }

  function handleStretchStart(data: { clipUrl: string; durationSec: number }) {
    console.log('7th inning stretch!', data);
    // TODO: Show stretch animation/video
  }

  function handleReactionBroadcast(data: { emoji: string; playerId: string; timestamp: number }) {
    console.log('Reaction received:', data);

    // Create visual reaction burst at random position
    const reactionId = `${data.playerId}-${data.timestamp}`;
    const x = Math.random() * 80 + 10; // 10-90% from left
    const y = Math.random() * 60 + 20; // 20-80% from top

    reactions = [...reactions, { id: reactionId, emoji: data.emoji, x, y, timestamp: data.timestamp }];

    // Remove reaction after animation completes (2 seconds)
    setTimeout(() => {
      reactions = reactions.filter((r) => r.id !== reactionId);
    }, 2000);
  }

  function handleHeckleShow(data: { text: string; durationSec: number }) {
    console.log('Heckle received:', data.text);

    // Show heckle
    currentHeckle = data.text;

    // Clear previous timeout
    if (heckleTimeout) {
      clearTimeout(heckleTimeout);
    }

    // Hide heckle after duration
    heckleTimeout = window.setTimeout(() => {
      currentHeckle = null;
      heckleTimeout = null;
    }, data.durationSec * 1000);
  }

  function sendReaction(emoji: string) {
    if (!socket || !matchId) return;

    // Throttle reactions
    const now = Date.now();
    if (now - lastReactionTime < reactionThrottle) {
      console.log('Reaction throttled, wait', Math.ceil((reactionThrottle - (now - lastReactionTime)) / 1000), 'seconds');
      return;
    }

    lastReactionTime = now;

    socket.emit('reaction:send', {
      matchId,
      emoji,
      timestamp: now,
    });

    console.log('Reaction sent:', emoji);
  }

  function submitAnswer() {
    if (!socket || !currentQuestion || !selectedAnswer || hasSubmitted) {
      return;
    }

    const submitTime = Date.now();

    socket.emit('answer:submit', {
      matchId,
      questionId: currentQuestion.id,
      choice: selectedAnswer,
      clientLatencyMs: clientLatency,
    });

    hasSubmitted = true;
  }

  function getPlayerScore() {
    if (!playerId || leaderboard.length === 0) {
      return { runs: 0, correct: 0, total: 0 };
    }

    const playerScore = leaderboard.find((p) => p.playerId === playerId);
    return playerScore || { runs: 0, correct: 0, total: 0 };
  }

  function getPlayerRank() {
    if (!playerId || leaderboard.length === 0) {
      return null;
    }

    const index = leaderboard.findIndex((p) => p.playerId === playerId);
    return index !== -1 ? index + 1 : null;
  }

  function isCorrectAnswer(choice: string): boolean {
    if (!revealData) return false;

    if (revealData.correctIndex !== undefined) {
      // Multiple choice or media question
      return currentQuestion?.choices?.[revealData.correctIndex] === choice;
    }

    // True/false or closest question
    return revealData.correctAnswer === choice;
  }

  function getMyRevealResult() {
    if (!revealData || !playerId) return null;
    return revealData.playerResults.find((p) => p.playerId === playerId);
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 p-4 relative overflow-hidden">
  <!-- Floating Reaction Bursts -->
  {#each reactions as reaction (reaction.id)}
    <div
      class="fixed text-6xl pointer-events-none animate-reaction-burst z-50"
      style="left: {reaction.x}%; top: {reaction.y}%;"
    >
      {reaction.emoji}
    </div>
  {/each}

  <!-- Heckle Banner -->
  {#if currentHeckle}
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 w-11/12 max-w-2xl">
      <div class="bg-yellow-400 text-yellow-900 font-bold text-lg px-6 py-4 rounded-lg shadow-lg border-2 border-yellow-600 animate-bounce-slow">
        <div class="text-center">
          😈 {currentHeckle}
        </div>
      </div>
    </div>
  {/if}

  <!-- Header with Score -->
  <div class="max-w-4xl mx-auto mb-4">
    <div class="bg-white/90 backdrop-blur rounded-lg p-4 flex items-center justify-between">
      <!-- Player Score -->
      <div class="flex items-center space-x-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{getPlayerScore().runs}</div>
          <div class="text-xs text-gray-500">Runs</div>
        </div>
        <div class="text-center">
          <div class="text-lg font-semibold">{getPlayerScore().correct}/{getPlayerScore().total}</div>
          <div class="text-xs text-gray-500">Correct</div>
        </div>
        {#if getPlayerRank()}
          <div class="text-center">
            <div class="text-lg font-semibold text-yellow-600">#{getPlayerRank()}</div>
            <div class="text-xs text-gray-500">Rank</div>
          </div>
        {/if}
      </div>

      <!-- Inning Display -->
      {#if matchState}
        <div class="text-center">
          <div class="text-sm text-gray-500">Inning</div>
          <div class="text-xl font-bold">{matchState.inning + 1}</div>
        </div>
      {/if}

      <!-- Connection Status -->
      <div class="flex items-center space-x-2">
        <div class="h-3 w-3 rounded-full {connected ? 'bg-green-500' : 'bg-red-500'}"></div>
        <span class="text-xs text-gray-600">{connected ? 'Live' : 'Disconnected'}</span>
      </div>
    </div>
  </div>

  <!-- Main Game Area -->
  <div class="max-w-4xl mx-auto">
    {#if !currentQuestion}
      <!-- Loading / Waiting State -->
      <div class="card text-center py-12">
        <div class="text-6xl mb-4 animate-spin">⚾</div>
        <p class="text-xl text-gray-600">Waiting for next question...</p>
      </div>
    {:else if showReveal && revealData}
      <!-- Reveal Phase -->
      <div class="card">
        <div class="text-center mb-6">
          <h2 class="text-3xl font-bold mb-2">📊 Results</h2>
          <p class="text-gray-600">{currentQuestion.text}</p>
        </div>

        <!-- Player's Result -->
        {#if getMyRevealResult()}
          {@const myResult = getMyRevealResult()}
          <div class="mb-6 p-6 rounded-lg {myResult.isCorrect ? 'bg-green-100 border-2 border-green-500' : 'bg-red-100 border-2 border-red-500'}">
            <div class="text-center">
              <div class="text-5xl mb-2">{myResult.isCorrect ? '✅' : '❌'}</div>
              <div class="text-2xl font-bold {myResult.isCorrect ? 'text-green-700' : 'text-red-700'}">
                {myResult.isCorrect ? 'Correct!' : 'Incorrect'}
              </div>
              {#if myResult.isCorrect}
                <div class="text-xl mt-2 text-green-600">
                  +{myResult.runsAwarded} run{myResult.runsAwarded !== 1 ? 's' : ''}
                  {#if myResult.runsAwarded === 4}
                    <span class="ml-2">🔥 {getPlayerScore().total === 1 ? 'Grand Slam!' : 'Speed Bonus!'}</span>
                  {/if}
                </div>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Correct Answer Display -->
        <div class="bg-blue-50 rounded-lg p-6 mb-6">
          <div class="text-center">
            <div class="text-sm text-gray-600 mb-2">Correct Answer:</div>
            <div class="text-2xl font-bold text-blue-700">{revealData.correctAnswer}</div>
          </div>
        </div>

        <!-- All Choices with Indicators -->
        {#if currentQuestion.choices && currentQuestion.type !== 'closest'}
          <div class="grid grid-cols-1 gap-3 mb-6">
            {#each currentQuestion.choices as choice, index}
              <div class="p-4 rounded-lg border-2 {isCorrectAnswer(choice) ? 'bg-green-50 border-green-500' : 'bg-gray-50 border-gray-200'}">
                <div class="flex items-center justify-between">
                  <span class="font-medium">{choice}</span>
                  {#if isCorrectAnswer(choice)}
                    <span class="text-green-600">✓</span>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <!-- Waiting Message -->
        <div class="text-center text-gray-500 text-sm">
          <p>⏳ Waiting for next question...</p>
        </div>
      </div>
    {:else}
      <!-- Question Phase -->
      <div class="card">
        <!-- Timer -->
        <div class="mb-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-600">Time Remaining</span>
            <span class="text-2xl font-bold {timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}">
              {timeRemaining}s
            </span>
          </div>
          <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              class="h-full transition-all duration-200 {timeRemaining <= 5 ? 'bg-red-500' : 'bg-blue-500'}"
              style="width: {Math.max(0, (timeRemaining / currentQuestion.timerSec) * 100)}%"
            ></div>
          </div>
        </div>

        <!-- Question Text -->
        <div class="mb-8">
          <h2 class="text-3xl font-bold text-center mb-4">{currentQuestion.text}</h2>

          <!-- Media Display -->
          {#if currentQuestion.mediaUrl}
            <div class="mb-4 rounded-lg overflow-hidden">
              <img src={currentQuestion.mediaUrl} alt="Question media" class="w-full max-h-64 object-contain" />
            </div>
          {/if}
        </div>

        <!-- Answer Options -->
        {#if currentQuestion.type === 'mc' || currentQuestion.type === 'media'}
          <!-- Multiple Choice -->
          <div class="grid grid-cols-1 gap-3">
            {#each currentQuestion.choices || [] as choice, index}
              <button
                on:click={() => (selectedAnswer = choice)}
                disabled={hasSubmitted}
                class="p-6 rounded-lg border-2 text-lg font-medium transition-all {selectedAnswer === choice
                  ? 'bg-blue-600 text-white border-blue-600 scale-105'
                  : 'bg-white border-gray-300 hover:border-blue-400 hover:bg-blue-50'} {hasSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
              >
                {choice}
              </button>
            {/each}
          </div>
        {:else if currentQuestion.type === 'tf'}
          <!-- True/False -->
          <div class="grid grid-cols-2 gap-4">
            <button
              on:click={() => (selectedAnswer = 'true')}
              disabled={hasSubmitted}
              class="p-8 rounded-lg border-2 text-2xl font-bold transition-all {selectedAnswer === 'true'
                ? 'bg-green-600 text-white border-green-600 scale-105'
                : 'bg-white border-gray-300 hover:border-green-400 hover:bg-green-50'} {hasSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
            >
              ✅ True
            </button>
            <button
              on:click={() => (selectedAnswer = 'false')}
              disabled={hasSubmitted}
              class="p-8 rounded-lg border-2 text-2xl font-bold transition-all {selectedAnswer === 'false'
                ? 'bg-red-600 text-white border-red-600 scale-105'
                : 'bg-white border-gray-300 hover:border-red-400 hover:bg-red-50'} {hasSubmitted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}"
            >
              ❌ False
            </button>
          </div>
        {:else if currentQuestion.type === 'closest'}
          <!-- Closest Number -->
          <div>
            <input
              type="number"
              bind:value={selectedAnswer}
              disabled={hasSubmitted}
              placeholder="Enter your answer"
              class="w-full px-6 py-4 text-3xl text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 {hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''}"
            />
          </div>
        {/if}

        <!-- Submit Button -->
        <div class="mt-6">
          <button
            on:click={submitAnswer}
            disabled={hasSubmitted || !selectedAnswer}
            class="w-full btn-primary text-xl py-4 {hasSubmitted ? 'opacity-50 cursor-not-allowed' : ''} {!selectedAnswer && !hasSubmitted ? 'opacity-50' : ''}"
          >
            {#if hasSubmitted}
              ✓ Answer Submitted
            {:else if !selectedAnswer}
              Select an Answer
            {:else}
              Submit Answer
            {/if}
          </button>
        </div>

        {#if hasSubmitted}
          <div class="mt-4 text-center text-sm text-gray-500">
            <p>⏳ Waiting for other players...</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Line Score (Bottom) -->
  {#if lineScore.length > 0}
    <div class="max-w-4xl mx-auto mt-4">
      <div class="bg-white/90 backdrop-blur rounded-lg p-4">
        <div class="text-xs text-gray-500 mb-2 text-center">Line Score (Runs per Inning)</div>
        <div class="flex justify-center space-x-1">
          {#each lineScore as runs, index}
            <div class="text-center min-w-[2rem]">
              <div class="text-xs text-gray-400">{index + 1}</div>
              <div class="text-sm font-bold {runs === null ? 'text-gray-300' : 'text-blue-600'}">
                {runs ?? '-'}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  {/if}

  <!-- Reactions Panel -->
  <div class="max-w-4xl mx-auto mt-4">
    <div class="bg-white/90 backdrop-blur rounded-lg p-4">
      <div class="text-xs text-gray-500 mb-2 text-center">Reactions</div>
      <div class="flex justify-center space-x-3">
        <button
          on:click={() => sendReaction('💥')}
          class="text-4xl p-3 rounded-lg hover:bg-gray-100 active:scale-110 transition-all"
          title="Boom!"
        >
          💥
        </button>
        <button
          on:click={() => sendReaction('🧢')}
          class="text-4xl p-3 rounded-lg hover:bg-gray-100 active:scale-110 transition-all"
          title="Cap"
        >
          🧢
        </button>
        <button
          on:click={() => sendReaction('🦜')}
          class="text-4xl p-3 rounded-lg hover:bg-gray-100 active:scale-110 transition-all"
          title="Parrot"
        >
          🦜
        </button>
        <button
          on:click={() => sendReaction('🔥')}
          class="text-4xl p-3 rounded-lg hover:bg-gray-100 active:scale-110 transition-all"
          title="Fire"
        >
          🔥
        </button>
        <button
          on:click={() => sendReaction('⚾')}
          class="text-4xl p-3 rounded-lg hover:bg-gray-100 active:scale-110 transition-all"
          title="Baseball"
        >
          ⚾
        </button>
        <button
          on:click={() => sendReaction('👏')}
          class="text-4xl p-3 rounded-lg hover:bg-gray-100 active:scale-110 transition-all"
          title="Clap"
        >
          👏
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes reaction-burst {
    0% {
      transform: scale(0) translateY(0);
      opacity: 1;
    }
    50% {
      transform: scale(1.5) translateY(-50px);
      opacity: 0.8;
    }
    100% {
      transform: scale(1) translateY(-100px);
      opacity: 0;
    }
  }

  .animate-reaction-burst {
    animation: reaction-burst 2s ease-out forwards;
  }

  @keyframes bounce-slow {
    0%, 100% {
      transform: translateY(0) translateX(-50%);
    }
    50% {
      transform: translateY(-10px) translateX(-50%);
    }
  }

  .animate-bounce-slow {
    animation: bounce-slow 2s ease-in-out infinite;
  }
</style>
