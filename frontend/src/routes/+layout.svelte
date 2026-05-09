<script lang="ts">
	import './layout.css';

	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="m-0 p-0 w-screen h-screen overflow-auto bg-amber-700">
	{@render children()}
</div>
