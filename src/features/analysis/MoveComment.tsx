import type { MoveRemark } from '../../services/commentary';
import { useLocalizeRemark } from './useLocalizeRemark';

interface MoveCommentProps {
  remarks: Array<MoveRemark>;
  isOwnMove: boolean;
}

export const MoveComment: React.FC<MoveCommentProps> = ({
  remarks,
  isOwnMove,
}) => {
  const localizeRemark = useLocalizeRemark();

  if (remarks.length === 0) {
    return null;
  }
  return (
    <p className='text-sm leading-snug'>
      {remarks.map((remark) => localizeRemark(remark, isOwnMove)).join(' ')}
    </p>
  );
};
