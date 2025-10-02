<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { initSocket, socketStore } from '$lib/socket';
  import type { Socket } from 'socket.io-client';

  let joinCode = '';
  let nickname = '';
  let avatar = '';
  let city = '';
  let cityOptIn = false;
  let loading = false;
  let error = '';
  let socket: Socket | null = null;

  // Avatar options
  const avatarOptions = ['⚾', '🏀', '🏈', '⚽', '🎾', '🏒', '🏐', '🎱'];

  onMount(() => {
    // Get join code from URL query params
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      joinCode = code.toUpperCase();
    }

    // Initialize socket
    socket = initSocket();
  });

  onDestroy(() => {
    // Clean up socket listeners
    if (socket) {
      socket.off('player:join:success');
      socket.off('player:join:error');
    }
  });

  function handleJoin() {
    if (!joinCode || !nickname) {
      error = 'Please enter a join code and nickname';
      return;
    }

    if (nickname.length > 20) {
      error = 'Nickname must be 20 characters or less';
      return;
    }

    loading = true;
    error = '';

    // First, fetch match ID from join code
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/matches/join/${joinCode}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error('Invalid join code');
        }
        return res.json();
      })
      .then((data) => {
        const matchId = data.data.matchId;

        // Set up socket listeners
        if (socket) {
          socket.once('player:join:success', (response: { player: any; state: any }) => {
            console.log('✓ Joined match:', response);
            // Navigate to lobby
            goto(`/lobby?match=${matchId}&player=${response.player.id}`);
          });

          socket.once('player:join:error', (response: { error: string }) => {
            error = response.error;
            loading = false;
          });

          // Emit join event
          socket.emit('player:join', {
            matchId,
            nickname: nickname.trim(),
            avatar: avatar || undefined,
            cityOptIn,
            city: cityOptIn ? city : undefined,
          });
        }
      })
      .catch((err) => {
        error = err.message || 'Failed to join match';
        loading = false;
      });
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !loading) {
      handleJoin();
    }
  }
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4">
  <div class="card max-w-md w-full">
    <div class="text-center mb-6">
      <h1 class="text-4xl font-bold mb-2">⚾ Join Game</h1>
      <p class="text-gray-600">Enter the game code to get started!</p>
    </div>

    {#if error}
      <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
        <p class="text-sm">{error}</p>
      </div>
    {/if}

    <form on:submit|preventDefault={handleJoin} class="space-y-4">
      <!-- Join Code -->
      <div>
        <label for="joinCode" class="block text-sm font-medium text-gray-700 mb-1">
          Game Code
        </label>
        <input
          id="joinCode"
          type="text"
          bind:value={joinCode}
          on:keypress={handleKeyPress}
          placeholder="ABC123"
          maxlength="6"
          class="w-full px-4 py-3 text-2xl font-bold text-center uppercase border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      <!-- Nickname -->
      <div>
        <label for="nickname" class="block text-sm font-medium text-gray-700 mb-1">
          Your Nickname
        </label>
        <input
          id="nickname"
          type="text"
          bind:value={nickname}
          on:keypress={handleKeyPress}
          placeholder="Enter your name"
          maxlength="20"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <p class="text-xs text-gray-500 mt-1">{nickname.length}/20 characters</p>
      </div>

      <!-- Avatar Selection -->
      <div>
        <div class="block text-sm font-medium text-gray-700 mb-2">
          Choose Your Avatar (Optional)
        </div>
        <div class="grid grid-cols-4 gap-2">
          {#each avatarOptions as option}
            <button
              type="button"
              on:click={() => (avatar = option)}
              class="text-4xl p-3 rounded-lg border-2 transition-all {avatar === option
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'}"
              disabled={loading}
            >
              {option}
            </button>
          {/each}
        </div>
      </div>

      <!-- City Opt-in -->
      <div class="border-t pt-4">
        <label class="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            bind:checked={cityOptIn}
            class="mt-1 h-5 w-5 text-blue-600 rounded"
            disabled={loading}
          />
          <div class="flex-1">
            <span class="text-sm font-medium text-gray-700">Show my city on the map</span>
            <p class="text-xs text-gray-500">Optional: Help visualize where players are from!</p>
          </div>
        </label>

        {#if cityOptIn}
          <input
            type="text"
            bind:value={city}
            placeholder="Your city"
            class="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
        {/if}
      </div>

      <!-- Submit Button -->
      <button
        type="submit"
        class="btn-primary w-full text-lg {loading ? 'opacity-50 cursor-not-allowed' : ''}"
        disabled={loading || !joinCode || !nickname}
      >
        {#if loading}
          <span class="inline-block animate-spin mr-2">⚾</span>
          Joining...
        {:else}
          Join Game
        {/if}
      </button>
    </form>

    <div class="mt-6 text-center">
      <a href="/" class="text-sm text-gray-500 hover:text-gray-700 underline">
        ← Back to Home
      </a>
    </div>
  </div>
</div>
