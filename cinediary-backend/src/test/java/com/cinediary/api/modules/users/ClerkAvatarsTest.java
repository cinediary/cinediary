package com.cinediary.api.modules.users;

import static org.assertj.core.api.Assertions.assertThat;

import com.cinediary.api.modules.users.domain.ClerkAvatars;
import org.junit.jupiter.api.Test;

class ClerkAvatarsTest
{
    private static final String GENERIC = "https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18x";
    private static final String UPLOADED = "https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwcyJ9";

    @Test
    void uploadedPhotoIsKept()
    {
        assertThat(ClerkAvatars.photoOrNull(UPLOADED, true)).isEqualTo(UPLOADED);
        assertThat(ClerkAvatars.photoOrNull(UPLOADED, null)).isEqualTo(UPLOADED);
    }

    @Test
    void noPhotoMeansInitialFallback()
    {
        assertThat(ClerkAvatars.photoOrNull(UPLOADED, false)).isNull(); // has_image=false manda
        assertThat(ClerkAvatars.photoOrNull(GENERIC, null)).isNull(); // JIT: genérico pelo URL
        assertThat(ClerkAvatars.photoOrNull(GENERIC, true)).isNull();
        assertThat(ClerkAvatars.photoOrNull(null, true)).isNull();
    }
}
