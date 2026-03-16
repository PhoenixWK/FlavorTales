package com.flavortales.audio.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TtsResponse {

    /** Language that was synthesized: "vi" or "en" */
    private String language;

    /** file_asset.file_id for the generated audio */
    private Integer fileId;

    /** Public R2 URL for the audio (for preview) */
    private String fileUrl;
}
