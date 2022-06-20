import { useEffect, useState } from "react";
import { Replicache } from "replicache";
import { M, mutators } from "../../frontend/mutators";
import Pusher from "pusher-js";
import dynamic from "next/dynamic.js";
import { randInt } from "../../frontend/rand";

const colors = [
  "#f94144",
  "#f3722c",
  "#f8961e",
  "#f9844a",
  "#f9c74f",
  "#90be6d",
  "#43aa8b",
  "#4d908e",
  "#577590",
  "#277da1",
];
const avatars = [
  ["🐶", "Puppy"],
  ["🐱", "Kitty"],
  ["🐭", "Mouse"],
  ["🐹", "Hamster"],
  ["🐰", "Bunny"],
  ["🦊", "Fox"],
  ["🐻", "Bear"],
  ["🐼", "Panda"],
  ["🐻‍❄️", "Polar Bear"],
  ["🐨", "Koala"],
  ["🐯", "Tiger"],
  ["🦁", "Lion"],
  ["🐮", "Cow"],
  ["🐷", "Piggy"],
  ["🐵", "Monkey"],
  ["🐣", "Chick"],
];

type UserInfo = {
  userName: string;
  color: string;
};

function randUserInfo(): UserInfo {
  const [icon, name] = avatars[randInt(0, avatars.length - 1)];
  return {
    userName: `${icon} ${name}`,
    color: colors[randInt(0, colors.length - 1)],
  };
}

const App = dynamic(() => import("../../frontend/app"), { ssr: false });

export default function Home() {
  const [rep, setRep] = useState<Replicache<M> | null>(null);

  // TODO: Think through Replicache + SSR.
  useEffect(() => {
    (async () => {
      if (rep) {
        return;
      }

      const [, , spaceID] = location.pathname.split("/");
      const r = new Replicache({
        // See https://doc.replicache.dev/licensing for how to get a license key.
        licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_LICENSE_KEY!,
        pushURL: `/api/replicache-push?spaceID=${spaceID}`,
        pullURL: `/api/replicache-pull?spaceID=${spaceID}`,
        name: spaceID,
        mutators,
      });

      if (
        process.env.NEXT_PUBLIC_PUSHER_KEY &&
        process.env.NEXT_PUBLIC_PUSHER_CLUSTER
      ) {
        Pusher.logToConsole = true;
        const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        });

        const channel = pusher.subscribe("default");
        channel.bind("poke", () => {
          r.pull();
        });
      }

      setRep(r);
    })();
  }, []);

  if (!rep) {
    return null;
  }

  const { userName, color } = randUserInfo();

  return (
    <div className="todoapp">
      <App rep={rep} editorID="one" cursorColor={color} userName={userName} />
    </div>
  );
}
