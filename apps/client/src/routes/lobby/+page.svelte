<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { socketStore } from '$lib/socket';
  import type { MatchPlayer } from '@jaysgame/shared';

  let matchId = '';
  let playerId = '';
  let players: MatchPlayer[] = [];
  let loading = true;

  $: matchState = $socketStore.matchState;
  $: connected = $socketStore.connected;

  // Reactive: Navigate to game when match starts
  $: if (matchState && matchState.phase !== 'lobby') {
    console.log('Match started! Navigating to game...');
    goto(`/game?match=${matchId}&player=${playerId}`);
  }

  // Reactive: Update players list from match state
  $: if (matchState) {
    players = matchState.players;
    loading = false;
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

    // Set up socket listeners
    const socket = $socketStore.socket;
    if (socket) {
      socket.on('player:joined', (data: { player: MatchPlayer }) => {
        console.log('Player joined:', data.player.nickname);
      });

      socket.on('player:left', (data: { playerId: string }) => {
        console.log('Player left:', data.playerId);
      });

      socket.on('player:disconnected', (data: { socketId: string }) => {
        console.log('Player disconnected:', data.socketId);
      });
    }
  });

  onDestroy(() => {
    const socket = $socketStore.socket;
    if (socket) {
      socket.off('player:joined');
      socket.off('player:left');
      socket.off('player:disconnected');
    }
  });

  function handleLeave() {
    const socket = $socketStore.socket;
    if (socket && matchId && playerId) {
      socket.emit('player:leave', { matchId, playerId });
      goto('/');
    }
  }
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-500 to-blue-600 p-4">
  <div class="card max-w-2xl w-full">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-5xl font-bold mb-2">⚾ Lobby</h1>
      <p class="text-xl text-gray-600">Waiting for host to start the game...</p>

      {#if !connected}
        <div class="mt-4 bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p class="text-sm">⚠️ Disconnected from server. Reconnecting...</p>
        </div>
      {/if}
    </div>

    <!-- Loading State -->
    {#if loading}
      <div class="text-center py-12">
        <div class="inline-block animate-spin text-6xl mb-4">⚾</div>
        <p class="text-gray-600">Loading players...</p>
      </div>
    {:else}
      <!-- Players List -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-2xl font-bold">Players ({players.length})</h2>
          <div class="flex items-center space-x-2">
            <div class="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
            <span class="text-sm text-gray-600">Live</span>
          </div>
        </div>

        {#if players.length === 0}
          <div class="text-center py-8 text-gray-500">
            <p>No players yet. Share the join code!</p>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            {#each players as player (player.id)}
              <div
                class="flex items-center space-x-3 p-4 rounded-lg transition-all {player.id ===
                playerId
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-50 border border-gray-200'}"
              >
                <!-- Avatar -->
                <div class="text-3xl">
                  {player.avatar || '👤'}
                </div>

                <!-- Player Info -->
                <div class="flex-1">
                  <div class="font-semibold text-lg">
                    {player.nickname}
                    {#if player.id === playerId}
                      <span class="text-xs text-blue-600 ml-1">(You)</span>
                    {/if}
                  </div>
                  {#if player.city}
                    <div class="text-sm text-gray-500">📍 {player.city}</div>
                  {/if}
                </div>

                <!-- Connection Status -->
                <div
                  class="h-2 w-2 rounded-full {player.socketId
                    ? 'bg-green-500'
                    : 'bg-gray-300'}"
                  title={player.socketId ? 'Connected' : 'Disconnected'}
                ></div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Waiting Message -->
      <div class="bg-gray-100 rounded-lg p-6 text-center">
        <div class="text-4xl mb-3">⏳</div>
        <p class="text-lg font-medium text-gray-700 mb-2">Waiting for the host to start...</p>
        <p class="text-sm text-gray-500">
          The game will begin automatically when the host is ready!
        </p>
      </div>

      <!-- Leave Button -->
      <div class="mt-6 text-center">
        <button
          on:click={handleLeave}
          class="px-6 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          Leave Game
        </button>
      </div>
    {/if}
  </div>

  <!-- Instructions -->
  <div class="mt-6 max-w-md text-center text-white text-sm">
    <p class="opacity-90">
      💡 Keep this screen open! The game will start automatically when the host begins.
    </p>
  </div>
</div>
