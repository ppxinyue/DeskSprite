import { Composition } from 'remotion';
import { Cat15ProductVideo } from './Cat15ProductVideo';
import { CodexProductVideo } from './CodexProductVideo';
import { DeskCatProductVideo, DESKCAT_PRODUCT_VIDEO_DURATION } from './DeskCatProductVideo';

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="Cat15ProductVideo"
        component={Cat15ProductVideo}
        durationInFrames={1920}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="CodexProductVideo"
        component={CodexProductVideo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="DeskCatProductVideo"
        component={DeskCatProductVideo}
        durationInFrames={DESKCAT_PRODUCT_VIDEO_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
