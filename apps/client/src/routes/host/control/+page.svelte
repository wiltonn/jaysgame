<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { initSocket, socketStore } from '$lib/socket';
  import type { Socket } from 'socket.io-client';
  import type { MatchPlayer, QuestionPayload, ScoreUpdatePayload } from '@jaysgame/shared';

  let matchId = '';
  let loading = true;
  let error = '';
  let socket: Socket | null = null;

  // Match data
  let joinCode = '';
  let qrCodeUrl = '';
  let players: MatchPlayer[] = [];
  let currentQuestion: QuestionPayload | null = null;
  let leaderboard: ScoreUpdatePayload['leaderboard'] = [];
  let lineScore: ScoreUpdatePayload['lineScore'] = [];

  // Control state
  let actionInProgress = false;
  let actionError = '';

  $: matchState = $socketStore.matchState;
  $: connected = $socketStore.connected;

  // Computed values
  $: currentPhase = matchState?.phase || 'lobby';
  $: currentInning = matchState?.inning !== undefined ? matchState.inning + 1 : 1;
  $: totalInnings = matchState?.totalInnings || 9;

  onMount(async () => {
    // Get match ID from URL
    const params = new URLSearchParams(window.location.search);
    matchId = params.get('match') || '';

    if (!matchId) {
      error = 'No match ID provided';
      goto('/host/setup');
      return;
    }

    // Initialize socket
    socket = initSocket();

    // Fetch match details
    await fetchMatchDetails();

    // Set up socket listeners
    if (socket) {
      socket.on('state:update', handleStateUpdate);
      socket.on('player:joined', handlePlayerJoined);
      socket.on('player:left', handlePlayerLeft);
      socket.on('question:show', handleQuestionShow);
      socket.on('score:update', handleScoreUpdate);
      socket.on('host:start:success', handleHostSuccess);
      socket.on('host:start:error', handleHostError);
      socket.on('host:action:success', handleHostSuccess);
      socket.on('host:action:error', handleHostError);
    }

    loading = false;
  });

  onDestroy(() => {
    if (socket) {
      socket.off('state:update');
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('question:show');
      socket.off('score:update');
      socket.off('host:start:success');
      socket.off('host:start:error');
      socket.off('host:action:success');
      socket.off('host:action:error');
    }
  });

  async function fetchMatchDetails() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/matches/${matchId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch match details');
      }

      const data = await response.json();
      joinCode = data.data.joinCode;
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.origin + '/join?code=' + joinCode)}`;

      console.log('Match details loaded:', data.data);
    } catch (err) {
      console.error('Error fetching match:', err);
      error = 'Failed to load match details';
    }
  }

  function handleStateUpdate(state: any) {
    console.log('State update:', state);
    players = state.players || [];
  }

  function handlePlayerJoined(data: { player: MatchPlayer }) {
    console.log('Player joined:', data.player.nickname);
  }

  function handlePlayerLeft(data: { playerId: string }) {
    console.log('Player left:', data.playerId);
  }

  function handleQuestionShow(data: { question: QuestionPayload; endsAt: number }) {
    console.log('Question shown:', data.question);
    currentQuestion = data.question;
  }

  function handleScoreUpdate(data: ScoreUpdatePayload) {
    console.log('Score update:', data);
    leaderboard = data.leaderboard;
    lineScore = data.lineScore;
  }

  function handleHostSuccess(data: any) {
    console.log('Host action success:', data);
    actionInProgress = false;
    actionError = '';
  }

  function handleHostError(data: { error: string }) {
    console.error('Host action error:', data.error);
    actionInProgress = false;
    actionError = data.error;
  }

  async function startMatch() {
    if (!socket || actionInProgress) return;

    actionInProgress = true;
    actionError = '';

    socket.emit('host:start', { matchId });
  }

  async function sendHostAction(action: 'pause' | 'resume' | 'skip' | 'reveal' | 'stretch') {
    if (!socket || actionInProgress) return;

    actionInProgress = true;
    actionError = '';

    socket.emit('host:action', { matchId, action });
  }

  function getPhaseDisplay(): string {
    switch (currentPhase) {
      case 'lobby':
        return '🏟️ Lobby - Waiting to Start';
      case 'question':
        return '❓ Question Active';
      case 'reveal':
        return '📊 Reveal Results';
      case 'stretch':
        return '🎬 7th Inning Stretch';
      case 'postgame':
        return '🏆 Game Complete';
      default:
        return '⏳ Loading...';
    }
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-700 p-4">
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-6">
      <h1 class="text-4xl font-bold text-white mb-2">🎯 Host Control</h1>
      <p class="text-lg text-white/90">{getPhaseDisplay()}</p>
    </div>

    {#if loading}
      <!-- Loading State -->
      <div class="card text-center py-12">
        <div class="text-6xl mb-4 animate-spin">⚾</div>
        <p class="text-xl text-gray-600">Loading match...</p>
      </div>
    {:else if error}
      <!-- Error State -->
      <div class="card text-center py-12">
        <div class="text-6xl mb-4">❌</div>
        <p class="text-xl text-red-600 mb-4">{error}</p>
        <a href="/host/setup" class="btn-primary">Back to Setup</a>
      </div>
    {:else}
      <!-- Main Control Interface -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Left Column: Match Info & Controls -->
        <div class="lg:col-span-1 space-y-4">
          <!-- Join Code Card -->
          <div class="card">
            <h2 class="text-lg font-bold mb-3">Join Code</h2>
            <div class="bg-blue-50 border-2 border-blue-500 rounded-lg p-4 text-center mb-3">
              <div class="text-3xl font-bold text-blue-600 tracking-widest">{joinCode}</div>
            </div>
            <div class="text-center">
              <img src={qrCodeUrl} alt="QR Code" class="w-40 h-40 mx-auto border-2 border-gray-300 rounded" />
            </div>
          </div>

          <!-- Match Status Card -->
          <div class="card">
            <h2 class="text-lg font-bold mb-3">Match Status</h2>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Inning:</span>
                <span class="font-semibold">{currentInning} of {totalInnings}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Players:</span>
                <span class="font-semibold">{players.length}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Connection:</span>
                <span class="font-semibold {connected ? 'text-green-600' : 'text-red-600'}">
                  {connected ? '✓ Connected' : '✗ Disconnected'}
                </span>
              </div>
            </div>
          </div>

          <!-- Control Buttons -->
          <div class="card">
            <h2 class="text-lg font-bold mb-3">Controls</h2>

            {#if actionError}
              <div class="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm mb-3">
                {actionError}
              </div>
            {/if}

            <div class="space-y-2">
              {#if currentPhase === 'lobby'}
                <button
                  on:click={startMatch}
                  disabled={actionInProgress || players.length === 0}
                  class="w-full btn-primary py-3 text-lg {actionInProgress || players.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
                >
                  {#if actionInProgress}
                    ⏳ Starting...
                  {:else}
                    🚀 Start Match
                  {/if}
                </button>

                {#if players.length === 0}
                  <p class="text-xs text-gray-500 text-center">Waiting for players to join...</p>
                {/if}
              {:else}
                <!-- In-Game Controls -->
                <button
                  on:click={() => sendHostAction('skip')}
                  disabled={actionInProgress}
                  class="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors {actionInProgress ? 'opacity-50 cursor-not-allowed' : ''}"
                >
                  ⏭️ Skip Question
                </button>

                <button
                  on:click={() => sendHostAction('reveal')}
                  disabled={actionInProgress || currentPhase !== 'question'}
                  class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors {actionInProgress || currentPhase !== 'question' ? 'opacity-50 cursor-not-allowed' : ''}"
                >
                  📊 Reveal Answer
                </button>

                <button
                  on:click={() => sendHostAction('stretch')}
                  disabled={actionInProgress || currentInning !== 7}
                  class="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors {actionInProgress || currentInning !== 7 ? 'opacity-50 cursor-not-allowed' : ''}"
                >
                  🎬 Trigger Stretch
                </button>
              {/if}
            </div>
          </div>
        </div>

        <!-- Middle Column: Current Question / Players -->
        <div class="lg:col-span-2 space-y-4">
          <!-- Current Question Display -->
          {#if currentQuestion && currentPhase === 'question'}
            <div class="card">
              <h2 class="text-lg font-bold mb-3">Current Question</h2>
              <div class="bg-blue-50 rounded-lg p-6 mb-4">
                <div class="text-2xl font-bold mb-4">{currentQuestion.text}</div>

                {#if currentQuestion.mediaUrl}
                  <div class="mb-4">
                    <img src={currentQuestion.mediaUrl} alt="Question media" class="max-h-48 mx-auto rounded" />
                  </div>
                {/if}

                {#if currentQuestion.choices}
                  <div class="grid grid-cols-2 gap-2">
                    {#each currentQuestion.choices as choice}
                      <div class="bg-white p-3 rounded border border-gray-300 text-center font-medium">
                        {choice}
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Players List -->
          <div class="card">
            <h2 class="text-lg font-bold mb-3">Players ({players.length})</h2>

            {#if players.length === 0}
              <div class="text-center py-8 text-gray-500">
                <p>No players yet. Share the join code!</p>
              </div>
            {:else}
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {#each players as player (player.id)}
                  <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div class="text-2xl">{player.avatar || '👤'}</div>
                    <div class="flex-1">
                      <div class="font-semibold">{player.nickname}</div>
                      {#if player.city}
                        <div class="text-xs text-gray-500">📍 {player.city}</div>
                      {/if}
                    </div>
                    <div class="h-2 w-2 rounded-full {player.socketId ? 'bg-green-500' : 'bg-gray-300'}"></div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Leaderboard -->
          {#if leaderboard.length > 0}
            <div class="card">
              <h2 class="text-lg font-bold mb-3">Leaderboard</h2>
              <div class="space-y-2">
                {#each leaderboard.slice(0, 10) as player, index (player.playerId)}
                  <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg {index === 0 ? 'border-2 border-yellow-500 bg-yellow-50' : 'border border-gray-200'}">
                    <div class="text-xl font-bold {index === 0 ? 'text-yellow-600' : 'text-gray-600'} w-8">
                      #{index + 1}
                    </div>
                    <div class="text-xl">{player.avatar || '👤'}</div>
                    <div class="flex-1 font-semibold">{player.nickname}</div>
                    <div class="text-right">
                      <div class="text-xl font-bold text-blue-600">{player.runs}</div>
                      <div class="text-xs text-gray-500">{player.correct}/{player.total} correct</div>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Line Score -->
          {#if lineScore.length > 0}
            <div class="card">
              <h2 class="text-lg font-bold mb-3">Line Score</h2>
              <div class="flex justify-center space-x-2">
                {#each lineScore as runs, index}
                  <div class="text-center min-w-[3rem]">
                    <div class="text-xs text-gray-500 mb-1">{index + 1}</div>
                    <div class="text-lg font-bold {runs === null ? 'text-gray-300' : 'text-blue-600'}">
                      {runs ?? '-'}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>
</div>
