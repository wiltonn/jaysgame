<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { initSocket, socketStore } from '$lib/socket';
  import type { Socket } from 'socket.io-client';
  import type { MatchSettings } from '@jaysgame/shared';

  let loading = false;
  let error = '';
  let socket: Socket | null = null;

  // Match creation state
  let selectedPackId = '';
  let matchMode = 'nine_innings';
  let settings: MatchSettings = {
    grandSlam: true,
    speedBonus: false,
    timerSec: 18,
  };

  // Available packs (will be fetched from API)
  let packs: Array<{ id: string; meta: any }> = [];

  // Created match data
  let matchId = '';
  let joinCode = '';
  let qrCodeUrl = '';

  $: connected = $socketStore.connected;

  onMount(async () => {
    // Initialize socket
    socket = initSocket();

    // Fetch available packs
    await fetchPacks();
  });

  async function fetchPacks() {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/packs`);

      if (!response.ok) {
        throw new Error('Failed to fetch packs');
      }

      const data = await response.json();
      packs = data.data || [];

      // Auto-select first pack if available
      if (packs.length > 0) {
        selectedPackId = packs[0].id;
      }
    } catch (err) {
      console.error('Error fetching packs:', err);
      error = 'Failed to load question packs. Please refresh the page.';
    }
  }

  async function createMatch() {
    if (!selectedPackId) {
      error = 'Please select a question pack';
      return;
    }

    loading = true;
    error = '';

    try {
      // Create match via API
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/matches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packId: selectedPackId,
          mode: matchMode,
          settings,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create match');
      }

      const data = await response.json();
      matchId = data.data.id;
      joinCode = data.data.joinCode;
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(window.location.origin + '/join?code=' + joinCode)}`;

      console.log('Match created:', { matchId, joinCode });

      // Navigate to host control screen
      setTimeout(() => {
        goto(`/host/control?match=${matchId}`);
      }, 2000);
    } catch (err) {
      console.error('Error creating match:', err);
      error = err instanceof Error ? err.message : 'Failed to create match';
      loading = false;
    }
  }

  function getPackTitle(pack: any): string {
    return pack.meta?.title || 'Untitled Pack';
  }

  function getPackDescription(pack: any): string {
    const sport = pack.meta?.sport || 'trivia';
    const team = pack.meta?.team || '';
    const difficulty = pack.meta?.difficulty || 'mixed';

    return `${sport.toUpperCase()}${team ? ' - ' + team : ''} • ${difficulty}`;
  }
</script>

<div class="min-h-screen bg-gradient-to-br from-green-600 to-blue-700 p-6">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-5xl font-bold text-white mb-2">⚾ Host Setup</h1>
      <p class="text-xl text-white/90">Configure your trivia match</p>
    </div>

    {#if !matchId}
      <!-- Setup Form -->
      <div class="card max-w-2xl mx-auto">
        {#if error}
          <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
            <p class="text-sm">{error}</p>
          </div>
        {/if}

        <!-- Pack Selection -->
        <div class="mb-6">
          <label for="pack" class="block text-lg font-semibold text-gray-700 mb-3">
            📦 Select Question Pack
          </label>

          {#if packs.length === 0}
            <div class="text-center py-8 text-gray-500">
              <p>Loading question packs...</p>
            </div>
          {:else}
            <div class="grid grid-cols-1 gap-3">
              {#each packs as pack (pack.id)}
                <button
                  type="button"
                  on:click={() => (selectedPackId = pack.id)}
                  class="p-4 rounded-lg border-2 text-left transition-all {selectedPackId === pack.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-300 hover:border-blue-300'}"
                >
                  <div class="font-semibold text-lg">{getPackTitle(pack)}</div>
                  <div class="text-sm text-gray-600 mt-1">{getPackDescription(pack)}</div>
                </button>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Match Mode -->
        <div class="mb-6">
          <div class="block text-lg font-semibold text-gray-700 mb-3">
            🎮 Match Mode
          </div>
          <div class="grid grid-cols-1 gap-3">
            <button
              type="button"
              on:click={() => (matchMode = 'nine_innings')}
              class="p-4 rounded-lg border-2 text-left transition-all {matchMode === 'nine_innings'
                ? 'bg-blue-50 border-blue-500'
                : 'bg-white border-gray-300 hover:border-blue-300'}"
            >
              <div class="font-semibold">9 Innings (Standard)</div>
              <div class="text-sm text-gray-600">Classic game with 9 rounds</div>
            </button>
          </div>
        </div>

        <!-- Settings -->
        <div class="mb-6">
          <div class="block text-lg font-semibold text-gray-700 mb-3">
            ⚙️ Game Settings
          </div>

          <div class="space-y-4">
            <!-- Timer -->
            <div>
              <label for="timer" class="block text-sm font-medium text-gray-700 mb-2">
                Timer per Question (seconds)
              </label>
              <input
                id="timer"
                type="number"
                bind:value={settings.timerSec}
                min="10"
                max="60"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Grand Slam -->
            <label class="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                bind:checked={settings.grandSlam}
                class="h-5 w-5 text-blue-600 rounded"
              />
              <div class="flex-1">
                <span class="text-sm font-medium text-gray-700">Grand Slam Mode</span>
                <p class="text-xs text-gray-500">Final question (inning 9) worth 4 runs</p>
              </div>
            </label>

            <!-- Speed Bonus -->
            <label class="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
              <input
                type="checkbox"
                bind:checked={settings.speedBonus}
                class="h-5 w-5 text-blue-600 rounded"
              />
              <div class="flex-1">
                <span class="text-sm font-medium text-gray-700">Speed Bonus</span>
                <p class="text-xs text-gray-500">Fastest 5 correct answers get +1 run bonus</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Create Button -->
        <div class="mt-8">
          <button
            on:click={createMatch}
            disabled={loading || !selectedPackId || packs.length === 0}
            class="btn-primary w-full text-xl py-4 {loading || !selectedPackId || packs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}"
          >
            {#if loading}
              <span class="inline-block animate-spin mr-2">⚾</span>
              Creating Match...
            {:else}
              Create Match & Get Join Code
            {/if}
          </button>
        </div>

        <!-- Back Link -->
        <div class="mt-6 text-center">
          <a href="/" class="text-sm text-gray-500 hover:text-gray-700 underline">
            ← Back to Home
          </a>
        </div>
      </div>
    {:else}
      <!-- Match Created - Show QR Code -->
      <div class="card max-w-2xl mx-auto text-center">
        <div class="mb-6">
          <div class="text-6xl mb-4">✅</div>
          <h2 class="text-3xl font-bold text-gray-800 mb-2">Match Created!</h2>
          <p class="text-gray-600">Players can join using this code</p>
        </div>

        <!-- Join Code Display -->
        <div class="mb-8">
          <div class="bg-blue-50 border-4 border-blue-500 rounded-lg p-8 inline-block">
            <div class="text-sm text-gray-600 mb-2">JOIN CODE</div>
            <div class="text-6xl font-bold text-blue-600 tracking-widest">{joinCode}</div>
          </div>
        </div>

        <!-- QR Code -->
        <div class="mb-8">
          <div class="text-sm text-gray-600 mb-3">Or scan this QR code:</div>
          <div class="inline-block bg-white p-4 rounded-lg border-2 border-gray-300">
            <img src={qrCodeUrl} alt="QR Code for joining" class="w-64 h-64" />
          </div>
        </div>

        <!-- Redirecting Message -->
        <div class="text-gray-500 text-sm">
          <p>⏳ Redirecting to host control in 2 seconds...</p>
        </div>
      </div>
    {/if}

    <!-- Connection Status -->
    <div class="mt-8 text-center">
      <div class="inline-flex items-center space-x-2 text-white/80 text-sm">
        <div class="h-2 w-2 rounded-full {connected ? 'bg-green-400' : 'bg-red-400'}"></div>
        <span>{connected ? 'Connected' : 'Disconnected'}</span>
      </div>
    </div>
  </div>
</div>
