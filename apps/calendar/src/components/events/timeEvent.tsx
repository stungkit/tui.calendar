import { h } from 'preact';
import { useRef, useState } from 'preact/hooks';

import { Template } from '@src/components/template';
import { useDispatch, useStore } from '@src/contexts/calendarStore';
import { useEventBus } from '@src/contexts/eventBus';
import { useLayoutContainer } from '@src/contexts/layoutContainer';
import { cls, toPercent } from '@src/helpers/css';
import { DRAGGING_TYPE_CREATORS } from '@src/helpers/drag';
import { useDrag } from '@src/hooks/common/useDrag';
import { useTransientUpdate } from '@src/hooks/common/useTransientUpdate';
import type EventUIModel from '@src/model/eventUIModel';
import { dndSelector, optionsSelector } from '@src/selectors';
import { DraggingState } from '@src/slices/dnd';
import type TZDate from '@src/time/date';
import { passConditionalProp } from '@src/utils/preact';
import { isNil, isPresent } from '@src/utils/type';

const classNames = {
  time: cls('event-time'),
  content: cls('event-time-content'),
  travelTime: cls('travel-time'),
  resizeHandleX: cls('resize-handler-x'),
  moveEvent: cls('dragging--move-event'),
  resizeEvent: cls('dragging--resize-vertical-event'),
};

interface Props {
  uiModel: EventUIModel;
  isResizingGuide?: boolean;
  nextStartTime?: TZDate | null;
}

function getStyles(uiModel: EventUIModel, isDraggingTarget: boolean, hasNextStartTime: boolean) {
  const {
    top,
    left,
    height,
    width,
    model,
    goingDurationHeight,
    modelDurationHeight,
    comingDurationHeight,
    croppedStart,
    croppedEnd,
  } = uiModel;
  // get theme values
  const travelBorderColor = 'white';
  const borderRadius = 2;
  const paddingLeft = 2;
  const defaultMarginBottom = 2;
  const marginLeft = left > 0 ? paddingLeft : 0;

  const { color, bgColor, borderColor } = model;
  const containerStyle: Record<string, string | number> = {
    width: width >= 0 ? `calc(${toPercent(width)} - ${marginLeft}px)` : '',
    height: `calc(${toPercent(height)} - ${defaultMarginBottom}px)`,
    top: toPercent(top),
    left: toPercent(left),
    borderRadius,
    borderLeft: `3px solid ${borderColor}`,
    marginLeft,
    color,
    backgroundColor: bgColor,
    opacity: isDraggingTarget ? 0.5 : 1,
    zIndex: hasNextStartTime ? 1 : 0,
  };
  const goingDurationStyle = {
    height: toPercent(goingDurationHeight),
    borderBottom: `1px dashed ${travelBorderColor}`,
  };
  const modelDurationStyle = {
    height: toPercent(modelDurationHeight),
  };
  const comingDurationStyle = {
    height: toPercent(comingDurationHeight),
    borderTop: `1px dashed ${travelBorderColor}`,
  };

  if (croppedStart) {
    containerStyle.borderTopLeftRadius = 0;
    containerStyle.borderTopRightRadius = 0;
  }

  if (croppedEnd) {
    containerStyle.borderBottomLeftRadius = 0;
    containerStyle.borderBottomRightRadius = 0;
  }

  return {
    containerStyle,
    goingDurationStyle,
    modelDurationStyle,
    comingDurationStyle,
  };
}

export function TimeEvent({ uiModel, nextStartTime, isResizingGuide = false }: Props) {
  const { useDetailPopup } = useStore(optionsSelector);

  const layoutContainer = useLayoutContainer();
  const { showDetailPopup } = useDispatch('popup');
  const { setDraggingEventUIModel } = useDispatch('dnd');

  const eventBus = useEventBus();

  const eventContainerRef = useRef<HTMLDivElement>(null);

  const [isDraggingTarget, setIsDraggingTarget] = useState<boolean>(false);

  const { model, goingDurationHeight, modelDurationHeight, comingDurationHeight, croppedEnd } =
    uiModel;
  const { isReadOnly, id, calendarId } = model;
  const { containerStyle, goingDurationStyle, modelDurationStyle, comingDurationStyle } = getStyles(
    uiModel,
    isDraggingTarget,
    isPresent(nextStartTime)
  );

  useTransientUpdate(dndSelector, ({ draggingEventUIModel, draggingState }) => {
    if (
      draggingState === DraggingState.DRAGGING &&
      draggingEventUIModel?.cid() === uiModel.cid() &&
      isNil(nextStartTime) &&
      !isResizingGuide
    ) {
      setIsDraggingTarget(true);
    } else {
      setIsDraggingTarget(false);
    }
  });

  const clearIsDraggingTarget = () => setIsDraggingTarget(false);

  const onMoveStart = useDrag(DRAGGING_TYPE_CREATORS.moveEvent('timeGrid', `${uiModel.cid()}`), {
    onDragStart: () => {
      setDraggingEventUIModel(uiModel);
      layoutContainer?.classList.add(classNames.moveEvent);
    },
    onMouseUp: (e, { draggingState }) => {
      layoutContainer?.classList.remove(classNames.moveEvent);
      clearIsDraggingTarget();

      const isClick = draggingState <= DraggingState.INIT;
      if (isClick && useDetailPopup && eventContainerRef.current) {
        showDetailPopup(
          {
            event: uiModel.model,
            eventRect: eventContainerRef.current.getBoundingClientRect(),
          },
          false
        );
      }

      eventBus.fire('clickEvent', { event: uiModel.model, nativeEvent: e });
    },
  });
  const handleMoveStart = (e: MouseEvent) => {
    e.stopPropagation();
    onMoveStart(e);
  };

  const onResizeStart = useDrag(
    DRAGGING_TYPE_CREATORS.resizeEvent('timeGrid', `${uiModel.cid()}`),
    {
      onDragStart: () => {
        setDraggingEventUIModel(uiModel);
        layoutContainer?.classList.add(classNames.resizeEvent);
      },
      onMouseUp: () => {
        layoutContainer?.classList.remove(classNames.resizeEvent);
        clearIsDraggingTarget();
      },
    }
  );
  const handleResizeStart = (e: MouseEvent) => {
    e.stopPropagation();
    onResizeStart(e);
  };

  const shouldShowResizeHandle = !croppedEnd && !isReadOnly && !isDraggingTarget;

  return (
    <div
      data-testid={`time-event-${model.title}-${uiModel.cid()}`}
      data-calendar-id={calendarId}
      data-event-id={id}
      className={classNames.time}
      style={containerStyle}
      onMouseDown={passConditionalProp(isNil(nextStartTime), handleMoveStart)}
      ref={eventContainerRef}
    >
      {goingDurationHeight ? (
        <div className={classNames.travelTime} style={goingDurationStyle}>
          <Template template="goingDuration" model={model} />
        </div>
      ) : null}
      {modelDurationHeight ? (
        <div className={classNames.content} style={modelDurationStyle}>
          <Template
            template="time"
            model={{
              start: isNil(nextStartTime) ? model.start : nextStartTime,
              title: model.title,
            }}
          />
        </div>
      ) : null}
      {comingDurationHeight ? (
        <div className={classNames.travelTime} style={comingDurationStyle}>
          <Template template="comingDuration" model={model} />
        </div>
      ) : null}
      {shouldShowResizeHandle ? (
        <div className={classNames.resizeHandleX} onMouseDown={handleResizeStart} />
      ) : null}
    </div>
  );
}