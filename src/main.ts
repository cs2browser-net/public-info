
import { config } from "dotenv";
import { PrefilterProcess } from "./metrics/prefilter";
import { FilterProcess } from "./metrics/filter";
import { PlayersProcess } from "./metrics/players";

config();

const RunTick = async () => {
    await PrefilterProcess();
    await FilterProcess();
    await PlayersProcess()
}

(async () => {
    await RunTick();
    setInterval(RunTick, 60000);
})()