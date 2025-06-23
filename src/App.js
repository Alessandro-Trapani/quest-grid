import DiceRoller from "./DiceRoller";
import AudioPlayer from "./AudioPlayer";
import DndBattleMap from "./DndBattleMap";
import InitiativeTracker from "./InitiativeTracker";
import DnDGrid from "./DnDGrid";
function App() {
  return (
    <>
      <DnDGrid />
      <InitiativeTracker />
      <DiceRoller />
      <AudioPlayer />
    </>
  );
}
export default App;
