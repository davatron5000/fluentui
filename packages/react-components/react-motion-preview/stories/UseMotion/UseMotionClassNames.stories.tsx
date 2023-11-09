import * as React from 'react';

import { useMotion, useMotionClassNames } from '@fluentui/react-motion-preview';
import { Button, makeStyles, shorthands, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  root: {
    height: '180px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    rowGap: '24px',
  },

  rectangle: {
    ...shorthands.borderRadius('8px'),

    width: '150px',
    height: '100px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colorBrandBackground,
    opacity: 0,
    transform: 'translate3D(0, 0, 0) scale(0.25)',
    transitionProperty: 'opacity, transform',
    willChange: 'opacity, transform',
    color: '#fff',
  },

  rectangleEnter: {
    opacity: 1,
    transform: 'translate3D(0, 0, 0) scale(1)',
    transitionTimingFunction: 'ease-out',
    transitionDuration: `${tokens.durationSlow}, ${tokens.durationGentle}`,
  },

  rectangleExiting: {
    opacity: 0,
    transform: 'translate3D(100%, 0, 0)',
    transitionTimingFunction: 'ease-in-out',
    transitionDuration: `${tokens.durationUltraSlow}, ${tokens.durationSlow}`,
  },
});

export const UseMotionClassNames = () => {
  const styles = useStyles();

  const [open, setOpen] = React.useState(false);
  const motion = useMotion<HTMLDivElement>(open);
  const motionClassNames = useMotionClassNames(motion, {
    default: styles.rectangle,
    enter: styles.rectangleEnter,
    exiting: styles.rectangleExiting,
  });

  return (
    <div className={styles.root}>
      <Button appearance="primary" onClick={() => setOpen(!open)}>
        Toggle
      </Button>

      {motion.canRender && (
        <div ref={motion.ref} className={motionClassNames}>
          Lorem ipsum
        </div>
      )}
    </div>
  );
};

UseMotionClassNames.parameters = {
  docs: {
    description: {
      story: [
        'When making complex animations, it might be hard to synchronize the class names with the state generated by the `useMotion` hook.',
        'In this case, you can use `useMotionClassNames` hook to specify the class names that should be applied to the element on each phase of the animation.',
        'Although this is not necessary, it makes is easier to understand what is happening in the code.',
        '#### Usage',
        // Hack to make the code block appear in the docs
        '```tsx \n' +
          `
const useMotionClassNames = (motion, {
  // Applied by default at all phases
  default: '',

  // Applied when the element is entering
  entering: '',

  // Applied when the element finished the entering phase
  entered: '',

  // Applied when the element is not animating but rendered
  idle: '',

  // Applied when the element is exiting
  exiting: '',

  // Applied when the element finished the exiting phase
  exited: '',

  // Special case. This class name is applied when the element is visible on the screen, whether it is animating or not.
  // This is a combination of the following stages: entering, entered, idle
  enter: '',

  // Special case. Applied when the element is being removed from the DOM
  // This is a combination of the following stages: exiting, exited
  exit: '',
})
        ` +
          '\n```',
      ].join('\n'),
    },
  },
};