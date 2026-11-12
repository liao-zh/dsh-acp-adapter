import { z } from 'zod';
/** Complete presentation data, kept separately from bounded diagnostic JSON. */
export declare const activityPresentationSchema: z.ZodObject<{
    diffs: z.ZodOptional<z.ZodArray<z.ZodObject<{
        path: z.ZodString;
        oldText: z.ZodNullable<z.ZodString>;
        newText: z.ZodString;
    }, z.core.$strip>>>;
    plan: z.ZodOptional<z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        status: z.ZodEnum<{
            completed: "completed";
            pending: "pending";
            in_progress: "in_progress";
        }>;
    }, z.core.$strip>>>;
    unavailable: z.ZodOptional<z.ZodEnum<{
        "too-large": "too-large";
        invalid: "invalid";
    }>>;
}, z.core.$strip>;
export type AcpActivityPresentation = z.infer<typeof activityPresentationSchema>;
/** Bound one presentation atomically; truncated file sides must never become a diff. */
export declare const ACTIVITY_PRESENTATION_BYTES: number;
export declare function boundedActivityPresentation(value: AcpActivityPresentation): AcpActivityPresentation;
/** Normalize only known ACP display fields. Transport details remain in the audit record. */
export declare function activityPresentation(value: unknown, kind: 'plan' | 'tool' | 'diff'): AcpActivityPresentation | undefined;
//# sourceMappingURL=activity-presentation.d.ts.map