<script lang="ts">
  let enter = () => {
    // später routing zu /world oder /projects
    console.log("enter portfolio");
  };
</script>

<div class="wrapper">
  <div class="bg-glow"></div>

  <main class="content">
    <p class="eyebrow">WEB DEVELOPER · CREATIVE BUILDER</p>

    <h1 class="title">
      HI, I'M<br />
      <span class="accent">NIKOLA</span>
    </h1>

    <p class="subtitle">
      
      <br />
      
    </p>

    <div class="actions">
      <button class="btn primary" on:click={enter}>
        Enter Portfolio →
      </button>

      <a class="btn secondary" href="#projects">
        View Projects
      </a>
    </div>
  </main>
</div>

<style>
.wrapper {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0a0a0a;
  color: white;
  position: relative;
  overflow: hidden;
  font-family: system-ui, sans-serif;
}

/* subtle animated glow */
.bg-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(255, 216, 77, 0.15), transparent 60%);
  filter: blur(80px);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translate(-10%, -10%); }
  50% { transform: translate(10%, 10%); }
}

.content {
  text-align: center;
  z-index: 2;
  max-width: 700px;
  padding: 20px;
}

.eyebrow {
  letter-spacing: 0.3em;
  font-size: 12px;
  opacity: 0.6;
  margin-bottom: 20px;
}

.title {
  font-size: 90px;
  line-height: 0.9;
  font-family: BebasNeue-Regular, sans-serif;
}

.accent {
  color: #ffd84d;
  text-shadow: 0 0 30px rgba(255, 216, 77, 0.4);
}

.subtitle {
  margin-top: 20px;
  font-size: 18px;
  opacity: 0.7;
  line-height: 1.5;
}

.actions {
  margin-top: 40px;
  display: flex;
  gap: 15px;
  justify-content: center;
  flex-wrap: wrap;
}

/* buttons */
.btn {
  padding: 14px 22px;
  border-radius: 999px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
  transition: 0.2s ease;
  border: none;
}

.primary {
  background: linear-gradient(135deg, #ffd84d, #ff4fd8);
  color: black;
  box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.primary:hover {
  transform: translateY(-2px) scale(1.03);
}

.secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: white;
}

.secondary:hover {
  border-color: #ffd84d;
  color: #ffd84d;
}
</style>