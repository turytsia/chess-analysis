import type { PieceSymbol } from 'chess.js';

import type {
  MoveRemark,
  PlanRemark,
  ReplyRemark,
} from '../../services/commentary';
import { useAnalysisTranslation } from '../../translations/hooks';

/*
 * Remarks are facts written from the mover's side. The text speaks to the
 * user instead, so every sentence exists twice: "Own" for the user's move and
 * "Theirs" for the other side's move. The same goes for the short "to ..."
 * phrases that are put into a sentence about a reply or a stronger idea: there
 * "Own" means the user is the one who would do it.
 */
export function useLocalizeRemark(): (
  remark: MoveRemark,
  isOwnMove: boolean
) => string {
  const { t } = useAnalysisTranslation();
  const pieces: Record<PieceSymbol, string> = {
    p: t('PiecePawn'),
    n: t('PieceKnight'),
    b: t('PieceBishop'),
    r: t('PieceRook'),
    q: t('PieceQueen'),
    k: t('PieceKing'),
  };
  const piecePlurals: Record<PieceSymbol, string> = {
    p: t('PiecesPawns'),
    n: t('PiecesKnights'),
    b: t('PiecesBishops'),
    r: t('PiecesRooks'),
    q: t('PiecesQueens'),
    k: t('PiecesKings'),
  };

  const phraseIdea = (
    idea: PlanRemark | ReplyRemark,
    isByUser: boolean
  ): string => {
    switch (idea.kind) {
      case 'givesCheck':
        return t('IdeaGivesCheck');
      case 'promotes':
        return isByUser
          ? t('IdeaPromotesOwn', { piece: pieces[idea.piece] })
          : t('IdeaPromotesTheirs', { piece: pieces[idea.piece] });
      case 'winsPiece':
        return isByUser
          ? t('IdeaWinsPieceOwn', { piece: pieces[idea.piece] })
          : t('IdeaWinsPieceTheirs', { piece: pieces[idea.piece] });
      case 'winsPawn':
        return isByUser ? t('IdeaWinsPawnOwn') : t('IdeaWinsPawnTheirs');
      case 'winsPieceFor':
        return isByUser
          ? t('IdeaWinsPieceForOwn', {
              taken: pieces[idea.taken],
              given: pieces[idea.given],
            })
          : t('IdeaWinsPieceForTheirs', {
              taken: pieces[idea.taken],
              given: pieces[idea.given],
            });
      case 'forks':
        return isByUser
          ? t('IdeaForksOwn', {
              first: pieces[idea.first],
              second: pieces[idea.second],
            })
          : t('IdeaForksTheirs', {
              first: pieces[idea.first],
              second: pieces[idea.second],
            });
      case 'threatens':
        return isByUser
          ? t('IdeaThreatensOwn', {
              piece: pieces[idea.piece],
              square: idea.square,
            })
          : t('IdeaThreatensTheirs', {
              piece: pieces[idea.piece],
              square: idea.square,
            });
      case 'takesBack':
        return isByUser
          ? t('IdeaTakesBackOwn', { square: idea.square })
          : t('IdeaTakesBackTheirs', { square: idea.square });
      case 'takesPiece':
        return isByUser
          ? t('IdeaTakesPieceOwn', {
              piece: pieces[idea.piece],
              square: idea.square,
            })
          : t('IdeaTakesPieceTheirs', {
              piece: pieces[idea.piece],
              square: idea.square,
            });
      case 'trades':
        return isByUser
          ? t('IdeaTradesOwn', {
              given: pieces[idea.given],
              taken: pieces[idea.taken],
              square: idea.square,
            })
          : t('IdeaTradesTheirs', {
              given: pieces[idea.given],
              taken: pieces[idea.taken],
              square: idea.square,
            });
      case 'tradesPieces':
        return isByUser
          ? t('IdeaTradesPiecesOwn', {
              pieces: piecePlurals[idea.piece],
              square: idea.square,
            })
          : t('IdeaTradesPiecesTheirs', {
              pieces: piecePlurals[idea.piece],
              square: idea.square,
            });
      case 'savesPiece':
        return isByUser
          ? t('IdeaSavesPieceOwn', { piece: pieces[idea.piece] })
          : t('IdeaSavesPieceTheirs', { piece: pieces[idea.piece] });
      case 'defendsPiece':
        return isByUser
          ? t('IdeaDefendsPieceOwn', {
              piece: pieces[idea.piece],
              square: idea.square,
            })
          : t('IdeaDefendsPieceTheirs', {
              piece: pieces[idea.piece],
              square: idea.square,
            });
      case 'castles':
        return idea.side === 'kingside'
          ? t('IdeaCastlesKingside')
          : t('IdeaCastlesQueenside');
      case 'develops':
        return isByUser
          ? t('IdeaDevelopsOwn', {
              piece: pieces[idea.piece],
              square: idea.square,
            })
          : t('IdeaDevelopsTheirs', {
              piece: pieces[idea.piece],
              square: idea.square,
            });
      case 'takesCenter':
        return isByUser
          ? t('IdeaTakesCenterOwn', { square: idea.square })
          : t('IdeaTakesCenterTheirs', { square: idea.square });
      case 'pushesPassedPawn':
        return isByUser
          ? t('IdeaPushesPassedPawnOwn', { square: idea.square })
          : t('IdeaPushesPassedPawnTheirs', { square: idea.square });
    }
  };

  return (remark, isOwnMove) => {
    switch (remark.kind) {
      case 'stalemate':
        return t('RemarkStalemate');
      case 'deadDraw':
        return t('RemarkDeadDraw');
      case 'bookMove':
        return t('RemarkBookMove');
      case 'excellentMove':
        return t('RemarkExcellentMove');
      case 'goodMove':
        return t('RemarkGoodMove');
      case 'goodButNotBest':
        return t('RemarkGoodButNotBest');
      case 'allows': {
        const idea = phraseIdea(remark.idea, !isOwnMove);
        const { reply, first } = remark;
        if (first === undefined) {
          return isOwnMove
            ? t('RemarkAllowsOwn', { reply, idea })
            : t('RemarkAllowsTheirs', { reply, idea });
        }
        return isOwnMove
          ? t('RemarkAllowsLaterOwn', { first, reply, idea })
          : t('RemarkAllowsLaterTheirs', { first, reply, idea });
      }
      case 'strongerPlan':
        return isOwnMove
          ? t('RemarkStrongerIdeaOwn', { idea: phraseIdea(remark.plan, true) })
          : t('RemarkStrongerIdeaTheirs', {
              idea: phraseIdea(remark.plan, false),
            });
      case 'checkmate':
        return isOwnMove ? t('RemarkCheckmateOwn') : t('RemarkCheckmateTheirs');
      case 'sacrifice':
        return isOwnMove
          ? t('RemarkSacrificeOwn', { piece: pieces[remark.piece] })
          : t('RemarkSacrificeTheirs', { piece: pieces[remark.piece] });
      case 'leadsToMate':
        return isOwnMove
          ? t('RemarkLeadsToMateOwn', { count: remark.moves })
          : t('RemarkLeadsToMateTheirs', { count: remark.moves });
      case 'onlyGoodMove':
        return isOwnMove
          ? t('RemarkOnlyGoodMoveOwn')
          : t('RemarkOnlyGoodMoveTheirs');
      case 'allowsMove':
        return isOwnMove
          ? t('RemarkAllowsMoveOwn', { reply: remark.reply })
          : t('RemarkAllowsMoveTheirs', { reply: remark.reply });
      case 'bestMove':
        return isOwnMove ? t('RemarkBestMoveOwn') : t('RemarkBestMoveTheirs');
      case 'promotes':
        return isOwnMove
          ? t('RemarkPromotesOwn', { piece: pieces[remark.piece] })
          : t('RemarkPromotesTheirs', { piece: pieces[remark.piece] });
      case 'winsPiece':
        return isOwnMove
          ? t('RemarkWinsPieceOwn', { piece: pieces[remark.piece] })
          : t('RemarkWinsPieceTheirs', { piece: pieces[remark.piece] });
      case 'winsPawn':
        return isOwnMove ? t('RemarkWinsPawnOwn') : t('RemarkWinsPawnTheirs');
      case 'winsPieceFor':
        return isOwnMove
          ? t('RemarkWinsPieceForOwn', {
              taken: pieces[remark.taken],
              given: pieces[remark.given],
            })
          : t('RemarkWinsPieceForTheirs', {
              taken: pieces[remark.taken],
              given: pieces[remark.given],
            });
      case 'forks':
        return isOwnMove
          ? t('RemarkForksOwn', {
              first: pieces[remark.first],
              second: pieces[remark.second],
            })
          : t('RemarkForksTheirs', {
              first: pieces[remark.first],
              second: pieces[remark.second],
            });
      case 'threatens':
        return isOwnMove
          ? t('RemarkThreatensOwn', {
              piece: pieces[remark.piece],
              square: remark.square,
            })
          : t('RemarkThreatensTheirs', {
              piece: pieces[remark.piece],
              square: remark.square,
            });
      case 'takesBack':
        return isOwnMove
          ? t('RemarkTakesBackOwn', { square: remark.square })
          : t('RemarkTakesBackTheirs', { square: remark.square });
      case 'takesPiece':
        return isOwnMove
          ? t('RemarkTakesPieceOwn', {
              piece: pieces[remark.piece],
              square: remark.square,
            })
          : t('RemarkTakesPieceTheirs', {
              piece: pieces[remark.piece],
              square: remark.square,
            });
      case 'trades':
        return isOwnMove
          ? t('RemarkTradesOwn', {
              given: pieces[remark.given],
              taken: pieces[remark.taken],
            })
          : t('RemarkTradesTheirs', {
              given: pieces[remark.given],
              taken: pieces[remark.taken],
            });
      case 'tradesPieces':
        return isOwnMove
          ? t('RemarkTradesPiecesOwn', { pieces: piecePlurals[remark.piece] })
          : t('RemarkTradesPiecesTheirs', {
              pieces: piecePlurals[remark.piece],
            });
      case 'savesPiece':
        return isOwnMove
          ? t('RemarkSavesPieceOwn', { piece: pieces[remark.piece] })
          : t('RemarkSavesPieceTheirs', { piece: pieces[remark.piece] });
      case 'defendsPiece':
        return isOwnMove
          ? t('RemarkDefendsPieceOwn', {
              piece: pieces[remark.piece],
              square: remark.square,
            })
          : t('RemarkDefendsPieceTheirs', {
              piece: pieces[remark.piece],
              square: remark.square,
            });
      case 'castles':
        return isOwnMove ? t('RemarkCastlesOwn') : t('RemarkCastlesTheirs');
      case 'develops':
        return isOwnMove
          ? t('RemarkDevelopsOwn', { piece: pieces[remark.piece] })
          : t('RemarkDevelopsTheirs', { piece: pieces[remark.piece] });
      case 'takesCenter':
        return isOwnMove
          ? t('RemarkTakesCenterOwn')
          : t('RemarkTakesCenterTheirs');
      case 'pushesPassedPawn':
        return isOwnMove
          ? t('RemarkPushesPassedPawnOwn')
          : t('RemarkPushesPassedPawnTheirs');
      case 'givesCheck':
        return isOwnMove
          ? t('RemarkGivesCheckOwn')
          : t('RemarkGivesCheckTheirs');
      case 'escapesCheck':
        return isOwnMove
          ? t('RemarkEscapesCheckOwn')
          : t('RemarkEscapesCheckTheirs');
      case 'forcedMove':
        return isOwnMove
          ? t('RemarkForcedMoveOwn')
          : t('RemarkForcedMoveTheirs');
      case 'allowsMate':
        return isOwnMove
          ? t('RemarkAllowsMateOwn', { count: remark.moves })
          : t('RemarkAllowsMateTheirs', { count: remark.moves });
      case 'missedMate':
        return isOwnMove
          ? t('RemarkMissedMateOwn', { count: remark.moves })
          : t('RemarkMissedMateTheirs', { count: remark.moves });
      case 'hangsMovedPiece':
        return isOwnMove
          ? t('RemarkHangsMovedPieceOwn', {
              piece: pieces[remark.piece],
              square: remark.square,
            })
          : t('RemarkHangsMovedPieceTheirs', {
              piece: pieces[remark.piece],
              square: remark.square,
            });
      case 'leavesPieceHanging':
        return isOwnMove
          ? t('RemarkLeavesPieceHangingOwn', {
              piece: pieces[remark.piece],
              square: remark.square,
            })
          : t('RemarkLeavesPieceHangingTheirs', {
              piece: pieces[remark.piece],
              square: remark.square,
            });
      case 'leavesPawnHanging':
        return isOwnMove
          ? t('RemarkLeavesPawnHangingOwn', { square: remark.square })
          : t('RemarkLeavesPawnHangingTheirs', { square: remark.square });
      case 'losesPieceAfter':
        return isOwnMove
          ? t('RemarkLosesPieceAfterOwn', {
              piece: pieces[remark.piece],
              reply: remark.reply,
            })
          : t('RemarkLosesPieceAfterTheirs', {
              piece: pieces[remark.piece],
              reply: remark.reply,
            });
      case 'losesPiece':
        return isOwnMove
          ? t('RemarkLosesPieceOwn', { piece: pieces[remark.piece] })
          : t('RemarkLosesPieceTheirs', { piece: pieces[remark.piece] });
      case 'losesPieceFor':
        return isOwnMove
          ? t('RemarkLosesPieceForOwn', {
              lost: pieces[remark.lost],
              won: pieces[remark.won],
            })
          : t('RemarkLosesPieceForTheirs', {
              lost: pieces[remark.lost],
              won: pieces[remark.won],
            });
      case 'losesPawn':
        return isOwnMove ? t('RemarkLosesPawnOwn') : t('RemarkLosesPawnTheirs');
      case 'losesMaterial':
        return isOwnMove
          ? t('RemarkLosesMaterialOwn')
          : t('RemarkLosesMaterialTheirs');
      case 'missedRecapture':
        return isOwnMove
          ? t('RemarkMissedRecaptureOwn', { piece: pieces[remark.piece] })
          : t('RemarkMissedRecaptureTheirs', { piece: pieces[remark.piece] });
      case 'missedPiece':
        return isOwnMove
          ? t('RemarkMissedPieceOwn', { piece: pieces[remark.piece] })
          : t('RemarkMissedPieceTheirs', { piece: pieces[remark.piece] });
      case 'missedMaterial':
        return isOwnMove
          ? t('RemarkMissedMaterialOwn')
          : t('RemarkMissedMaterialTheirs');
      case 'missedChance':
        return isOwnMove
          ? t('RemarkMissedChanceOwn')
          : t('RemarkMissedChanceTheirs');
      case 'givesUpCastling':
        return isOwnMove
          ? t('RemarkGivesUpCastlingOwn')
          : t('RemarkGivesUpCastlingTheirs');
      case 'strongerMoveAvailable':
        return isOwnMove
          ? t('RemarkStrongerMoveAvailableOwn')
          : t('RemarkStrongerMoveAvailableTheirs');
    }
  };
}
