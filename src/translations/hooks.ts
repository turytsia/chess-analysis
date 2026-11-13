import { useTranslation, type UseTranslationResponse } from 'react-i18next';

export function useLibraryTranslation(): UseTranslationResponse<
  'library',
  undefined
> {
  return useTranslation('library');
}

export function useAnalysisTranslation(): UseTranslationResponse<
  'analysis',
  undefined
> {
  return useTranslation('analysis');
}

export function useTrainerTranslation(): UseTranslationResponse<
  'trainer',
  undefined
> {
  return useTranslation('trainer');
}
