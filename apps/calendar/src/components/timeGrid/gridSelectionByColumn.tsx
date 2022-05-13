import { h } from 'preact';
import { useCallback, useMemo } from 'preact/hooks';

import { useStore } from '@src/contexts/calendarStore';
import { cls, toPercent } from '@src/helpers/css';
import { timeGridSelectionHelper } from '@src/helpers/gridSelection';
import { isNil } from '@src/utils/type';

import type { TimeGridRow } from '@t/grid';
import type { CalendarState } from '@t/store';

function GridSelection({ top, height, text }: { top: number; height: number; text: string }) {
  const style = {
    top: toPercent(top),
    height: toPercent(height),
  };

  return (
    <div
      className={cls('grid-selection')}
      style={style}
      data-testid={`time-grid-selection-${top}-${height}`}
    >
      {text.length > 0 ? <span className={cls('grid-selection-label')}>{text}</span> : null}
    </div>
  );
}

interface Props {
  columnIndex: number;
  timeGridRows: TimeGridRow[];
}

export function GridSelectionByColumn({ columnIndex, timeGridRows }: Props) {
  const gridSelectionData = useStore(
    useCallback(
      (state: CalendarState) =>
        timeGridSelectionHelper.calculateSelection(state.gridSelection.timeGrid, columnIndex),
      [columnIndex]
    )
  );

  const gridSelectionProps = useMemo(() => {
    if (!gridSelectionData) {
      return null;
    }

    const { startRowIndex, endRowIndex, isStartingColumn, isSelectingMultipleColumns } =
      gridSelectionData;

    const { top: startRowTop, startTime: startRowStartTime } = timeGridRows[startRowIndex];
    const {
      top: endRowTop,
      height: endRowHeight,
      endTime: endRowEndTime,
    } = timeGridRows[endRowIndex];

    const gridSelectionHeight = endRowTop + endRowHeight - startRowTop;

    let text = `${startRowStartTime} - ${endRowEndTime}`;
    if (isSelectingMultipleColumns) {
      text = isStartingColumn ? startRowStartTime : '';
    }

    return {
      top: startRowTop,
      height: gridSelectionHeight,
      text,
    };
  }, [gridSelectionData, timeGridRows]);

  if (isNil(gridSelectionProps)) {
    return null;
  }

  return <GridSelection {...gridSelectionProps} />;
}