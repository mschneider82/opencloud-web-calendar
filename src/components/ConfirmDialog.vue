<script setup lang="ts">
defineProps<{
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  confirmDanger?: boolean
}>()

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="ext:fixed ext:inset-0 ext:z-50 ext:flex ext:items-center ext:justify-center ext:bg-black/50"
      @click.self="emit('cancel')"
    >
      <div class="ext:bg-white ext:rounded-lg ext:shadow-xl ext:w-full ext:max-w-md ext:mx-4">
        <!-- Header -->
        <div class="ext:px-6 ext:py-4 ext:border-b">
          <h2 class="ext:text-lg ext:font-semibold ext:text-gray-900">
            {{ title }}
          </h2>
        </div>

        <!-- Content -->
        <div class="ext:px-6 ext:py-4">
          <p class="ext:text-sm ext:text-gray-700">
            {{ message }}
          </p>
        </div>

        <!-- Footer -->
        <div
          class="ext:flex ext:items-center ext:justify-end ext:gap-3 ext:px-6 ext:py-4 ext:border-t ext:bg-gray-50"
        >
          <button
            type="button"
            class="ext:px-4 ext:py-2 ext:text-sm ext:text-gray-700 ext:bg-gray-200 ext:rounded hover:ext:bg-gray-300"
            @click="emit('cancel')"
          >
            Cancel
          </button>
          <button
            type="button"
            class="ext:px-4 ext:py-2 ext:text-sm ext:text-white ext:rounded hover:ext:opacity-90"
            :class="
              confirmDanger
                ? 'ext:bg-red-600 hover:ext:bg-red-700'
                : 'ext:bg-blue-600 hover:ext:bg-blue-700'
            "
            @click="emit('confirm')"
          >
            {{ confirmText || 'Confirm' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
