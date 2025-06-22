import DiceRoller from "./DiceRoller";
import AudioPlayer from "./AudioPlayer";
import DndBattleMap from "./DndBattleMap";
import InitiativeTracker from "./InitiativeTracker";
function App() {
  return (
    <>
      <DndBattleMap />
      <InitiativeTracker />
      <DiceRoller />
      <AudioPlayer />
    </>
  );
}
export default App;
