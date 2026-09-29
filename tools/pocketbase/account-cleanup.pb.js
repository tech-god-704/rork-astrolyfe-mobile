/// <reference path="../pb_data/types.d.ts" />
// Account deletion cleanup — NOT YET DEPLOYED. Copy to
// /home/cloudpod/pb-astrolyfe-main/pb_hooks/account-cleanup.pb.js and restart the
// instance. (CloudPod's write_hook_file tool could not write it: its syntax check
// writes to a read-only /tmp on the MCP host. See HANDOFF.md.)
//
// Deleting a users record cascades only to collections that reach it through a
// relation field with cascadeDelete set — push_tokens and notification_log do, and
// so do profiles, chat_conversations and chat_messages.
//
// The collections keyed by a plain user_email text column do NOT cascade: readings,
// compatibility_tests, course_progress, user_reports, astro_reports and purchases.
// Left alone they outlive the account, still holding the customer's email, their
// generated reading content and their partner names. Guideline 5.1.1(v) requires
// deleting the account AND the data tied to it.
//
// The app's client-side fallback already deletes these (EMAIL_KEYED in
// providers/AuthProvider.tsx). This hook makes it hold for ANY deletion path — the
// PHP delete-account endpoint, the PocketBase admin UI — without widening client
// delete rules. It runs after the users record is gone, so it cannot block or undo a
// deletion; every step is best-effort and logged.
const EMAIL_KEYED_COLLECTIONS = [
    'readings',
    'compatibility_tests',
    'course_progress',
    'user_reports',
    'astro_reports',
    'purchases',
];

onRecordAfterDeleteSuccess((e) => {
    const email = e.record.getString('email');

    if (!email) {
        e.app.logger().warn(
            'deleted user had no email; skipping email-keyed cleanup',
            'userId', e.record.id
        );
        e.next();
        return;
    }

    for (const collection of EMAIL_KEYED_COLLECTIONS) {
        try {
            const rows = e.app.findRecordsByFilter(
                collection,
                'user_email = {:email}',
                '',
                0,
                0,
                { email: email }
            );

            let removed = 0;
            for (const row of rows) {
                try {
                    e.app.delete(row);
                    removed++;
                } catch (rowErr) {
                    e.app.logger().error(
                        'failed to delete row during account cleanup',
                        'collection', collection,
                        'recordId', row.id,
                        'error', String(rowErr)
                    );
                }
            }

            if (removed > 0) {
                e.app.logger().info(
                    'account cleanup removed rows',
                    'collection', collection,
                    'count', removed,
                    'userId', e.record.id
                );
            }
        } catch (err) {
            e.app.logger().error(
                'account cleanup failed for collection',
                'collection', collection,
                'userId', e.record.id,
                'error', String(err)
            );
        }
    }

    e.next();
}, 'users');
