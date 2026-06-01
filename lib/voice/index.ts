export {
  generateVoice,
  voiceCacheKey,
  type GenerateVoiceInput,
  type GenerateVoiceResult,
  type VoiceMetadata,
} from '@/lib/voice/generateVoice'

export {
  VOICE_PROFILES,
  selectVoiceProfile,
  voiceProfileById,
  voiceProfileLabel,
  type VoiceProfile,
  type VoiceProfileId,
} from '@/lib/voice/voiceProfiles'

export {
  applyVoiceDirectionToBlueprints,
  applyVoicePausesToScript,
  buildSceneVoiceDirection,
  buildSceneVoiceDirections,
  buildVoiceDirectorPlan,
  type SceneVoiceDirection,
  type VoiceDirectorInput,
  type VoiceDirectorPlan,
} from '@/lib/voice/voiceDirector'
