import * as commander from "npm:commander";

import { xPubCmd } from "/client/cli/cmd_xpub.ts";
import { lockCmd } from "/client/cli/cmd_lock.ts";
import { hostCmd } from "/client/cli/cmd_host.ts";
import { walkCmd } from "/client/cli/cmd_walk.ts";
import { diffCmd } from "/client/cli/cmd_diff.ts";
import { publishCmd } from "/client/cli/cmd_publish.ts";
import { statusCmd } from "/client/cli/cmd_status.ts";
import { paymentsCmd } from "/client/cli/cmd_payments.ts";
import { wipeCmd } from "/client/cli/cmd_wipe.ts";
import { txCmd } from "/client/cli/cmd_tx.ts";
import { redeemCmd } from "/client/cli/cmd_redeem.ts";
import { showCmd } from "/client/cli/cmd_show.ts";

export const cmd = new commander.Command('htvm');
cmd.addCommand(xPubCmd);
cmd.addCommand(lockCmd);
cmd.addCommand(hostCmd);
cmd.addCommand(walkCmd);
cmd.addCommand(diffCmd);
cmd.addCommand(publishCmd);
cmd.addCommand(statusCmd);
cmd.addCommand(paymentsCmd);
cmd.addCommand(wipeCmd);
cmd.addCommand(txCmd);
cmd.addCommand(redeemCmd);
cmd.addCommand(showCmd);













