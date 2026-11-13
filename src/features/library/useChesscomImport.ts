import { toast } from 'sonner';

import { ChesscomErrorCode } from '../../services/chesscom';
import { useImportStore } from '../../stores/importStore';
import { useLibraryTranslation } from '../../translations/hooks';

export type ChesscomImportHandler = (
  username: string,
  monthLimit: number | undefined
) => Promise<boolean>;

export function useChesscomImport(): ChesscomImportHandler {
  const { t } = useLibraryTranslation();
  const startChesscomImport = useImportStore(
    (state) => state.startChesscomImport
  );

  const localizeError = (code: ChesscomErrorCode): string =>
    ({
      [ChesscomErrorCode.NotFound]: t('ChesscomUserNotFound'),
      [ChesscomErrorCode.RateLimited]: t('ChesscomRateLimited'),
      [ChesscomErrorCode.Network]: t('ChesscomUnreachable'),
      [ChesscomErrorCode.Unexpected]: t('ChesscomUnexpectedError'),
    }[code]);

  return async (username, monthLimit) => {
    const result = await startChesscomImport(username, monthLimit);
    if (result.status === 'failed') {
      toast.error(localizeError(result.code));
      return false;
    }
    if (result.status === 'done') {
      toast.success(
        t('GamesImportedWithCount', { count: result.summary.imported }),
        {
          description:
            result.summary.imported === 0 ? t('LibraryUpToDate') : undefined,
        }
      );
    }
    return result.status === 'done';
  };
}
