
import "dotenv/config";
import { PrefilterProcess } from "./metrics/prefilter";
import { FilterProcess } from "./metrics/filter";
import { PlayersProcess } from "./metrics/players";

let tickInProgress = false;

const RunTick = async () => {
    if (tickInProgress) {
        return;
    }

    tickInProgress = true;
    try {
        await PrefilterProcess();
        await FilterProcess();
        await PlayersProcess();
    } catch (error) {
        console.error("RunTick failed", error);
    } finally {
        tickInProgress = false;
    }
}

(async () => {
    await RunTick();
    setInterval(() => {
        void RunTick();
    }, 60000);
})()