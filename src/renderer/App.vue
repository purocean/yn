<template>
  <router-view />
</template>

<style lang="scss">
@import url('normalize.css');

* {
  outline: none;
}

::selection {
  background: rgba(255, 255, 255, 0.3);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb {
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.09);
  box-shadow: inset 0 0 6px rgba(255, 255, 255, 0.1);
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

@media screen {
  body {
    background: #282a2b;
  }
}

@media print {
  .no-print {
    display: none;
  }
}
</style>
