/**
 * Shared kernel: módulo aberto (todos os módulos podem usar), sem depender de nenhum módulo.
 */
@ApplicationModule(type = ApplicationModule.Type.OPEN, displayName = "Shared Kernel")
package com.cinediary.api.shared;

import org.springframework.modulith.ApplicationModule;
