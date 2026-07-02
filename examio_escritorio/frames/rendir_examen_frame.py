import time
import threading
import customtkinter as ctk
from theme import *
from CTkMessagebox import CTkMessagebox

try:
    import keyboard as kb
    _HAS_KEYBOARD = True
except ImportError:
    _HAS_KEYBOARD = False


class RendirExamenFrame(ctk.CTkFrame):
    def __init__(self, master, on_logout, user_data=None, exam_config=None, **kwargs):
        super().__init__(master, **kwargs)
        self.on_logout = on_logout
        self.user_data = user_data or {}
        self.exam_config = exam_config or {}

        self.titulo = self.exam_config.get("titulo", "Evaluación Sin Título")
        self.catedra = self.exam_config.get("catedra", "Cátedra no especificada")
        self.duracion_minutos = int(self.exam_config.get("duracion_minutos", 90))
        self.tiempo_restante = self.duracion_minutos * 60
        self._timer_running = False
        self._entregado = False

        self.preguntas_mock = self.exam_config.get("preguntas", [
            {
                "id": 1,
                "enunciado": "¿Cuál es el resultado de la siguiente expresión: lim(x→0) (sen x)/x?",
                "tipo": "mc",
                "opciones": [
                    {"texto": "0", "correcta": False},
                    {"texto": "1", "correcta": True},
                    {"texto": "∞", "correcta": False},
                    {"texto": "No existe", "correcta": False},
                ]
            },
            {
                "id": 2,
                "enunciado": "Explique el Teorema Fundamental del Cálculo y su importancia en el análisis matemático.",
                "tipo": "abierta",
                "opciones": []
            },
            {
                "id": 3,
                "enunciado": "Una función f es continua en un punto x=a si se cumple que:",
                "tipo": "mc",
                "opciones": [
                    {"texto": "lim(x→a) f(x) = f(a)", "correcta": True},
                    {"texto": "f'(a) existe", "correcta": False},
                    {"texto": "f está definida en a", "correcta": False},
                    {"texto": "lim(x→a) f(x) existe", "correcta": False},
                ]
            }
        ])

        self.pregunta_actual = 0
        self.respuestas = {}
        self._fraudes_reportados = set()
        self._security_active = False
        self._fullscreen_monitor_id = None
        self._focus_monitor_id = None
        self._build_ui()
        self._mostrar_pregunta()
        self._iniciar_temporizador()
        self._configurar_seguridad()

    def _build_ui(self):
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=1)

        header = ctk.CTkFrame(self, fg_color=WHITE, height=72, corner_radius=0,
                              border_width=0)
        header.grid(row=0, column=0, sticky="ew")
        header.grid_propagate(False)
        header.grid_columnconfigure(0, weight=0)
        header.grid_columnconfigure(1, weight=0)
        header.grid_columnconfigure(2, weight=1)
        header.grid_columnconfigure(3, weight=0)

        ctk.CTkLabel(header, text="EXAMIO", font=(FONT_FAMILY, 18, "bold"),
                     text_color=PRIMARY).grid(row=0, column=0, padx=(20, 4), pady=8)

        ctk.CTkLabel(header, text="Entorno Seguro de Evaluación",
                     font=(FONT_FAMILY, FONT_SIZE_SM),
                     text_color=GRAY_500).grid(row=1, column=0, columnspan=2,
                                                padx=(20, 0), pady=(0, 8), sticky="w")

        ctk.CTkLabel(header, text="|", font=(FONT_FAMILY, 20),
                     text_color=GRAY_300).grid(row=0, column=1, rowspan=2, padx=8)

        title_frame = ctk.CTkFrame(header, fg_color="transparent")
        title_frame.grid(row=0, column=2, rowspan=2, sticky="w", padx=(0, 0))
        title_frame.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(title_frame, text=self.titulo,
                     font=(FONT_FAMILY, FONT_SIZE_LG, "bold"),
                     text_color=GRAY_900).grid(row=0, column=0, sticky="w")

        ctk.CTkLabel(title_frame, text=self.catedra,
                     font=(FONT_FAMILY, FONT_SIZE_SM),
                     text_color=GRAY_500).grid(row=1, column=0, sticky="w")

        self.timer_label = ctk.CTkLabel(header, text="⏱️ 00:00",
                                        font=(FONT_FAMILY, FONT_SIZE_XL, "bold"),
                                        text_color=GRAY_700)
        self.timer_label.grid(row=0, column=3, rowspan=2, padx=24, pady=8)

        body = ctk.CTkFrame(self, fg_color=GRAY_50, corner_radius=0)
        body.grid(row=1, column=0, sticky="nsew")
        body.grid_columnconfigure(0, weight=1)
        body.grid_columnconfigure(1, weight=0)
        body.grid_rowconfigure(0, weight=1)

        center = ctk.CTkFrame(body, fg_color=WHITE, corner_radius=CORNER_RADIUS_LG)
        center.grid(row=0, column=0, sticky="nsew", padx=24, pady=16)
        center.grid_columnconfigure(0, weight=1)
        center.grid_rowconfigure(1, weight=1)
        self.center = center

        nav_panel = ctk.CTkFrame(body, fg_color=WHITE, width=240,
                                 corner_radius=CORNER_RADIUS_LG)
        nav_panel.grid(row=0, column=1, sticky="ns", padx=(0, 24), pady=16)
        nav_panel.grid_propagate(False)
        nav_panel.grid_columnconfigure(0, weight=1)
        self.nav_panel = nav_panel

        self._build_nav_panel()

        self.progress_label = ctk.CTkLabel(center, text="",
                                           font=(FONT_FAMILY, FONT_SIZE_SM),
                                           text_color=GRAY_500)
        self.progress_label.grid(row=0, column=0, sticky="w", padx=20, pady=(16, 4))

        self.enunciado_label = ctk.CTkLabel(center, text="",
                                            font=(FONT_FAMILY, FONT_SIZE_LG, "bold"),
                                            text_color=GRAY_900, wraplength=600,
                                            justify="left")
        self.enunciado_label.grid(row=1, column=0, sticky="nw", padx=20, pady=(8, 16))

        self.respuestas_frame = ctk.CTkFrame(center, fg_color="transparent")
        self.respuestas_frame.grid(row=2, column=0, sticky="nsew", padx=20, pady=(0, 16))
        self.respuestas_frame.grid_columnconfigure(0, weight=1)

    def _build_nav_panel(self):
        ctk.CTkLabel(self.nav_panel, text="Registro de Respuestas",
                     font=(FONT_FAMILY, FONT_SIZE_MD, "bold"),
                     text_color=GRAY_900).grid(row=0, column=0, padx=16, pady=(16, 8))

        nav_grid = ctk.CTkFrame(self.nav_panel, fg_color="transparent")
        nav_grid.grid(row=1, column=0, padx=16, pady=(0, 12), sticky="ew")
        nav_grid.grid_columnconfigure((0, 1, 2, 3, 4), weight=1, uniform="col")

        self.nav_buttons = []
        for i in range(len(self.preguntas_mock)):
            btn = ctk.CTkButton(nav_grid, text=str(i + 1), width=36, height=36,
                                corner_radius=6,
                                fg_color=GRAY_100, hover_color=GRAY_200,
                                text_color=GRAY_700,
                                font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                                command=lambda idx=i: self._ir_a_pregunta(idx))
            btn.grid(row=i // 5, column=i % 5, padx=2, pady=2)
            self.nav_buttons.append(btn)

        self.nav_bar = ctk.CTkFrame(self.nav_panel, fg_color="transparent")
        self.nav_bar.grid(row=2, column=0, padx=16, pady=(0, 16), sticky="ew")
        self.nav_bar.grid_columnconfigure(0, weight=1)
        self.nav_bar.grid_columnconfigure(1, weight=1)

        self.prev_btn = ctk.CTkButton(self.nav_bar, text="← Anterior",
                                      font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                                      height=36, corner_radius=CORNER_RADIUS,
                                      fg_color=WHITE, hover_color=GRAY_100,
                                      text_color=GRAY_600, border_width=1,
                                      border_color=GRAY_300,
                                      command=self._anterior_pregunta)
        self.prev_btn.grid(row=0, column=0, padx=(0, 4), sticky="ew")

        self.next_btn = ctk.CTkButton(self.nav_bar, text="Siguiente →",
                                      font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                                      height=36, corner_radius=CORNER_RADIUS,
                                      fg_color=PRIMARY, hover_color=PRIMARY_HOVER,
                                      text_color=WHITE,
                                      command=self._siguiente_pregunta)
        self.next_btn.grid(row=0, column=1, padx=(4, 0), sticky="ew")

        self.submit_btn = ctk.CTkButton(self.nav_panel, text="Entregar Examen",
                                        font=(FONT_FAMILY, FONT_SIZE_MD, "bold"),
                                        height=44, corner_radius=CORNER_RADIUS,
                                        fg_color=SUCCESS, hover_color="#047857",
                                        text_color=WHITE,
                                        command=self._confirmar_entrega)
        self.submit_btn.grid(row=3, column=0, padx=16, pady=(0, 16), sticky="ew")

    def _actualizar_nav_botones(self):
        total = len(self.preguntas_mock)
        self.progress_label.configure(text=f"Pregunta {self.pregunta_actual + 1} de {total}")

        for i, btn in enumerate(self.nav_buttons):
            is_current = i == self.pregunta_actual
            has_answer = i in self.respuestas
            if is_current:
                btn.configure(fg_color=PRIMARY, text_color=WHITE, hover_color=PRIMARY_HOVER)
            elif has_answer:
                btn.configure(fg_color=SUCCESS_LIGHT, text_color=SUCCESS, hover_color=GRAY_200)
            else:
                btn.configure(fg_color=GRAY_100, text_color=GRAY_700, hover_color=GRAY_200)

        self.prev_btn.configure(state="normal" if self.pregunta_actual > 0 else "disabled")
        if self.pregunta_actual == total - 1:
            self.next_btn.configure(text="Finalizar Examen ✓", fg_color=SUCCESS,
                                    hover_color="#047857")
        else:
            self.next_btn.configure(text="Siguiente →", fg_color=PRIMARY,
                                    hover_color=PRIMARY_HOVER)

    def _mostrar_pregunta(self):
        for w in self.respuestas_frame.winfo_children():
            w.destroy()

        if self.pregunta_actual >= len(self.preguntas_mock):
            return

        pregunta = self.preguntas_mock[self.pregunta_actual]
        self.enunciado_label.configure(text=pregunta["enunciado"])
        self._actualizar_nav_botones()

        if pregunta["tipo"] == "mc":
            self._render_mc(pregunta)
        else:
            self._render_abierta(pregunta)

    def _render_mc(self, pregunta):
        self.respuestas_frame.grid_rowconfigure(0, weight=0)
        ctk.CTkLabel(self.respuestas_frame, text="Seleccioná una opción:",
                     font=(FONT_FAMILY, FONT_SIZE_MD, "bold"),
                     text_color=GRAY_700).grid(row=0, column=0, sticky="w", pady=(0, 12))

        self.radio_var = ctk.StringVar(value="")
        saved = self.respuestas.get(self.pregunta_actual, {})
        if saved.get("tipo") == "mc":
            self.radio_var.set(str(saved.get("valor", "")))

        for idx, opcion in enumerate(pregunta["opciones"]):
            rb = ctk.CTkRadioButton(self.respuestas_frame,
                                    text=opcion["texto"],
                                    variable=self.radio_var,
                                    value=str(idx),
                                    font=(FONT_FAMILY, FONT_SIZE_MD),
                                    fg_color=PRIMARY, border_color=GRAY_300,
                                    border_width_unchecked=2,
                                    hover_color=PRIMARY_HOVER,
                                    text_color=GRAY_800,
                                    command=self._guardar_respuesta_mc)
            rb.grid(row=idx + 1, column=0, sticky="w", pady=6)

    def _render_abierta(self, pregunta):
        ctk.CTkLabel(self.respuestas_frame, text="Escribí tu respuesta:",
                     font=(FONT_FAMILY, FONT_SIZE_MD, "bold"),
                     text_color=GRAY_700).grid(row=0, column=0, sticky="w", pady=(0, 12))

        self.respuestas_frame.grid_rowconfigure(1, weight=1)

        saved = self.respuestas.get(self.pregunta_actual, {})
        saved_text = saved.get("valor", "") if saved.get("tipo") == "abierta" else ""

        self.text_area = ctk.CTkTextbox(self.respuestas_frame,
                                        font=(FONT_FAMILY, FONT_SIZE_MD),
                                        corner_radius=CORNER_RADIUS,
                                        border_color=GRAY_300, border_width=1,
                                        fg_color=GRAY_50, text_color=GRAY_900,
                                        activate_scrollbars=True)
        self.text_area.grid(row=1, column=0, sticky="nsew", pady=(0, 8))
        if saved_text:
            self.text_area.insert("0.0", saved_text)

        self.text_area.bind("<KeyRelease>", lambda e: self._guardar_respuesta_abierta())

    def _guardar_respuesta_mc(self):
        val = self.radio_var.get()
        if val:
            self.respuestas[self.pregunta_actual] = {"tipo": "mc", "valor": val}
            self._actualizar_nav_botones()

    def _guardar_respuesta_abierta(self):
        texto = self.text_area.get("0.0", "end").strip()
        if texto:
            self.respuestas[self.pregunta_actual] = {"tipo": "abierta", "valor": texto}
        elif self.pregunta_actual in self.respuestas:
            del self.respuestas[self.pregunta_actual]
        self._actualizar_nav_botones()

    def _ir_a_pregunta(self, idx):
        if self.preguntas_mock[self.pregunta_actual]["tipo"] == "abierta" and hasattr(self,
                                                                                      'text_area'):
            self._guardar_respuesta_abierta()
        self.pregunta_actual = idx
        self._mostrar_pregunta()

    def _anterior_pregunta(self):
        if self.pregunta_actual > 0:
            self._ir_a_pregunta(self.pregunta_actual - 1)

    def _siguiente_pregunta(self):
        if self.pregunta_actual < len(self.preguntas_mock) - 1:
            self._ir_a_pregunta(self.pregunta_actual + 1)
        else:
            self._confirmar_entrega()

    def _confirmar_entrega(self):
        msg = CTkMessagebox(title="Confirmar Entrega",
                            message="¿Confirmás la entrega definitiva del examen?\n\nTodas las respuestas serán enviadas y no podrán modificarse.",
                            icon="question", option_1="Cancelar",
                            option_2="Entregar Examen",
                            button_color=SUCCESS, button_text_color=WHITE,
                            cancel_button_color=GRAY_200)
        if msg.get() == "Entregar Examen":
            self._entregar_examen()

    def _entregar_examen(self):
        self._entregado = True
        self._timer_running = False

        respondidas = len(self.respuestas)
        total = len(self.preguntas_mock)
        tiempo_uso = self.duracion_minutos * 60 - self.tiempo_restante

        print("=" * 60)
        print("ENTREGA DE EXAMEN")
        print("=" * 60)
        print(f"Usuario: {self.user_data.get('nombre', 'N/A')}")
        print(f"Examen: {self.titulo}")
        print(f"Cátedra: {self.catedra}")
        print(f"Preguntas respondidas: {respondidas}/{total}")
        print(f"Tiempo utilizado: {tiempo_uso // 60} min {tiempo_uso % 60} seg")
        print("-" * 40)
        for idx, r in self.respuestas.items():
            p = self.preguntas_mock[idx]
            print(f"Pregunta {idx + 1}: {p['enunciado'][:60]}...")
            if r["tipo"] == "mc":
                op_idx = int(r["valor"])
                print(f"  Respuesta: {p['opciones'][op_idx]['texto']}")
            else:
                print(f"  Respuesta: {r['valor'][:80]}...")
        print("=" * 60)

        CTkMessagebox(title="Examen Entregado",
                      message=f"✅ Examen entregado correctamente.\n\nRespondiste {respondidas} de {total} preguntas.\n\nRevisá la consola para ver el detalle.",
                      icon="check", option_1="Finalizar",
                      button_color=SUCCESS, button_text_color=WHITE)
        self.on_logout()

    def _configurar_seguridad(self):
        self._security_active = True
        self._forzar_kiosko()
        self._bloquear_portapapeles()
        self._bloquear_captura_pantalla()
        self._bloquear_cierre()
        self._monitorear_enfoque()
        if _HAS_KEYBOARD:
            self._keyboard_hook()

    # ── KIOSKO: fullscreen real + captura total de entrada ──────────────

    def _forzar_kiosko(self):
        try:
            w = self.master.winfo_screenwidth()
            h = self.master.winfo_screenheight()
            self.master.overrideredirect(True)
            self.master.geometry(f"{w}x{h}+0+0")
            self.master.attributes('-topmost', True)
            self.master.focus_force()
            self.master.update()
            self.master.grab_set()
        except Exception as e:
            print(f"[WARN] Error al forzar kiosko: {e}")
        self._monitorear_fullscreen()

    def _monitorear_fullscreen(self):
        if not self._security_active or self._entregado or not self.winfo_exists():
            return
        try:
            if not self.master.attributes('-fullscreen') and not self.master.overrideredirect():
                self._reportar_fraude("Intento de salir del modo pantalla completa")
                self._reforzar_kiosko()
        except Exception:
            pass
        self._fullscreen_monitor_id = self.after(800, self._monitorear_fullscreen)

    def _reforzar_kiosko(self):
        try:
            w = self.master.winfo_screenwidth()
            h = self.master.winfo_screenheight()
            self.master.overrideredirect(True)
            self.master.geometry(f"{w}x{h}+0+0")
            self.master.attributes('-topmost', True)
            self.master.focus_force()
            self.master.grab_set()
        except Exception:
            pass

    def _monitorear_enfoque(self):
        if not self._security_active or self._entregado or not self.winfo_exists():
            return
        try:
            focused = self.master.focus_get()
            if focused is None:
                self._reportar_fraude("Intento de cambiar de ventana o perder el foco")
                self.master.focus_force()
                self.master.lift()
                self.master.attributes('-topmost', True)
                self.master.after(50, lambda: self.master.attributes('-topmost', False))
                self.master.after(100, lambda: self.master.attributes('-topmost', True))
                self.master.grab_set()
        except Exception:
            pass
        self._focus_monitor_id = self.after(500, self._monitorear_enfoque)

    # ── BLOQUEO PORTAPAPELES ──────────────────────────────────────────

    def _bloquear_portapapeles(self):
        def _rechazar(e):
            return self._reportar_fraude("Intento de usar portapapeles (copiar/pegar/cortar)") or 'break'

        for cls_name in ('Entry', 'Text'):
            for seq in ('<<Copy>>', '<<Paste>>', '<<Cut>>'):
                try:
                    self.master.bind_class(cls_name, seq, _rechazar, add='+')
                except Exception:
                    pass

        self.master.bind_all('<Control-c>', lambda e: _rechazar(e) or 'break', add='+')
        self.master.bind_all('<Control-C>', lambda e: _rechazar(e) or 'break', add='+')
        self.master.bind_all('<Control-v>', lambda e: _rechazar(e) or 'break', add='+')
        self.master.bind_all('<Control-V>', lambda e: _rechazar(e) or 'break', add='+')
        self.master.bind_all('<Control-x>', lambda e: _rechazar(e) or 'break', add='+')
        self.master.bind_all('<Control-X>', lambda e: _rechazar(e) or 'break', add='+')
        self.master.bind_all('<Button-3>', lambda e: _rechazar(e) or 'break', add='+')

    # ── CAPTURA DE PANTALLA ──────────────────────────────────────────

    def _bloquear_captura_pantalla(self):
        self.master.bind_all('<KeyPress>', self._on_tecla, add='+')

    def _on_tecla(self, event):
        if not self._security_active:
            return
        ks = event.keysym.lower()
        if event.keysym in ('Print', 'Snapshot', 'F13', 'Cancel'):
            return self._reportar_fraude("Intento de captura de pantalla") or 'break'
        if ks == 'print':
            return self._reportar_fraude("Intento de captura de pantalla") or 'break'
        state = event.state
        ctrl = bool(state & 0x4)
        if ctrl and ks in ('c', 'v', 'x', 'insert'):
            return self._reportar_fraude(f"Intento de usar atajo de teclado Ctrl+{event.keysym}") or 'break'
        alt = bool(state & 0x20000)
        if alt and ks in ('print', 'snapshot'):
            return self._reportar_fraude("Intento de captura de pantalla (Alt+PrintScreen)") or 'break'
        if event.keysym == 'F11':
            return self._reportar_fraude("Intento de salir de pantalla completa (F11)") or 'break'
        if event.keysym in ('Escape', 'Pause', 'Break'):
            self.after(0, self._reforzar_kiosko)
            return 'break'
        win = bool(state & 0x8)
        if win and event.keysym.lower() in ('s', 'shift'):
            return self._reportar_fraude("Intento de captura de pantalla (Win+Shift+S)") or 'break'
        if event.keysym in ('Super_L', 'Super_R', 'Win_L', 'Win_R'):
            return 'break'

    # ── KEYBOARD LIBRARY HOOKS (globales, capturan fuera de la app) ──

    def _keyboard_hook(self):
        try:
            def _hook(desc):
                def _cb(e=None):
                    self._reportar_fraude(desc)
                return _cb

            for combo, desc in [
                ("print screen", "Captura de pantalla (Impr Pant)"),
                ("alt+print screen", "Captura de pantalla (Alt+Impr Pant)"),
                ("windows+shift+s", "Captura de pantalla (Win+Shift+S)"),
                ("alt+tab", "Intento de cambiar de ventana (Alt+Tab)"),
                ("alt+escape", "Intento de cambiar de ventana (Alt+Esc)"),
                ("ctrl+escape", "Intento de abrir menú Inicio"),
                ("windows", "Intento de usar tecla Windows"),
                ("ctrl+alt+del", "Intento de usar Ctrl+Alt+Supr"),
                ("ctrl+shift+escape", "Intento de abrir Administrador de tareas"),
            ]:
                kb.add_hotkey(combo, _hook(desc), suppress=True)
            print("[SEGURIDAD] Hooks globales de teclado activados")
        except Exception as e:
            print(f"[WARN] Hooks globales requieren administrador: {e}")

    # ── CIERRE DE VENTANA ─────────────────────────────────────────────

    def _bloquear_cierre(self):
        try:
            self.master.protocol("WM_DELETE_WINDOW", self._on_intento_cierre)
        except Exception:
            pass

    def _on_intento_cierre(self):
        self._reportar_fraude("Intento de cerrar la ventana del examen")

    # ── REPORTE DE FRAUDE ─────────────────────────────────────────────

    def _reportar_fraude(self, tipo):
        if self._entregado or not self._security_active or tipo in self._fraudes_reportados:
            return 'break'
        self._fraudes_reportados.add(tipo)
        usuario = self.user_data.get('nombre', 'N/A')
        legajo = self.user_data.get('legajo', 'N/A')
        print(f"\n{'=' * 70}")
        print(f"🚨 [ALERTA DE SEGURIDAD] {tipo}")
        print(f"   Usuario: {usuario} ({legajo})")
        print(f"   Examen: {self.titulo}")
        print(f"{'=' * 70}")
        self.after(0, lambda: CTkMessagebox(
            title="Alerta de Seguridad",
            message=f"Se ha detectado: {tipo}\n\nEl docente será notificado de esta acción.\n\nUsuario: {usuario} ({legajo})",
            icon="warning", option_1="Entendido",
            button_color=WARNING, button_text_color=WHITE
        ))
        return 'break'

    # ── DESTRUIR / LIMPIAR ────────────────────────────────────────────

    def destroy(self):
        self._timer_running = False
        self._entregado = True
        self._security_active = False

        if self._fullscreen_monitor_id:
            try:
                self.after_cancel(self._fullscreen_monitor_id)
            except Exception:
                pass
        if self._focus_monitor_id:
            try:
                self.after_cancel(self._focus_monitor_id)
            except Exception:
                pass

        try:
            kb.unhook_all()
        except Exception:
            pass

        try:
            self.master.grab_release()
        except Exception:
            pass
        try:
            self.master.overrideredirect(False)
            self.master.attributes('-fullscreen', False)
            self.master.attributes('-topmost', False)
            self.master.protocol("WM_DELETE_WINDOW", self.master.destroy)
        except Exception:
            pass

        super().destroy()

    def _safe_timer_update(self, text):
        try:
            if self.winfo_exists():
                self.timer_label.configure(text=text)
        except Exception:
            pass

    def _safe_timer_color(self, color):
        try:
            if self.winfo_exists():
                self.timer_label.configure(text_color=color)
        except Exception:
            pass

    def _safe_auto_entregar(self):
        try:
            if self.winfo_exists():
                self._auto_entregar()
        except Exception:
            pass

    def _iniciar_temporizador(self):
        self._timer_running = True
        self.timer_label.configure(text_color=GRAY_700)

        def tick():
            while self._timer_running and self.tiempo_restante > 0 and not self._entregado:
                time.sleep(1)
                self.tiempo_restante -= 1
                mins, secs = divmod(self.tiempo_restante, 60)
                time_str = f"⏱️ {mins:02d}:{secs:02d}"
                if self.winfo_exists():
                    self.after(0, lambda s=time_str: self._safe_timer_update(s))

                if self.tiempo_restante <= 120 and self.winfo_exists():
                    self.after(0, lambda: self._safe_timer_color(DANGER))
                if self.tiempo_restante <= 0 and self.winfo_exists():
                    self.after(0, self._safe_auto_entregar)
                    break

        threading.Thread(target=tick, daemon=True).start()

    def _auto_entregar(self):
        if self._entregado:
            return
        CTkMessagebox(title="Tiempo Agotado",
                      message="⏰ El tiempo del examen ha finalizado.\n\nTu examen será entregado automáticamente.",
                      icon="warning", option_1="Aceptar",
                      button_color=WARNING, button_text_color=WHITE)
        self._entregar_examen()
