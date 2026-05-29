import { Router, type IRouter } from "express";
import { db, userProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const rows = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.firebaseUid, uid))
      .limit(1);
    if (!rows.length || !rows[0].onboardedAt) {
      return res.json({ onboarded: false });
    }
    return res.json({ onboarded: true, onboardingData: rows[0].onboardingData });
  } catch (err) {
    req.log.error({ err }, "GET /users/:uid failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    const data = req.body ?? {};
    await db
      .insert(userProfilesTable)
      .values({
        firebaseUid: uid,
        onboardedAt: new Date(),
        onboardingData: data,
      })
      .onConflictDoUpdate({
        target: userProfilesTable.firebaseUid,
        set: {
          onboardingData: data,
          onboardedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    return res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "PUT /users/:uid failed");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
