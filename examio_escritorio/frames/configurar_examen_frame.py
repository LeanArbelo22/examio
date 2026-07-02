import json
import customtkinter as ctk
from theme import *
from CTkMessagebox import CTkMessagebox


class ConfigurarExamenFrame(ctk.CTkFrame):
    def __init__(self, master, on_logout, user_data=None, **kwargs):
        super().__init__(master, **kwargs)
        self.on_logout = on_logout
        self.user_data = user_data or {}
        self.preguntas = []
        self._build_ui()

    def _build_ui(self):
        self.grid_rowconfigure(0, weight=0)
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(0, weight=0)
        self.grid_columnconfigure(1, weight=1)

        header = ctk.CTkFrame(self, fg_color=WHITE, height=64, corner_radius=0)
        header.grid(row=0, column=0, columnspan=2, sticky="ew")
        header.grid_propagate(False)
        header.grid_columnconfigure(0, weight=1)
        header.grid_columnconfigure(1, weight=0)

        ctk.CTkLabel(header, text="Configurar Nueva Evaluación",
                     font=(FONT_FAMILY, FONT_SIZE_XL, "bold"),
                     text_color=GRAY_900).grid(row=0, column=0, sticky="w", padx=24, pady=16)

        logout_btn = ctk.CTkButton(header, text="Cerrar Sesión",
                                   font=(FONT_FAMILY, FONT_SIZE_SM),
                                   fg_color=GRAY_100, hover_color=GRAY_200,
                                   text_color=GRAY_700, corner_radius=CORNER_RADIUS,
                                   height=32, width=100, command=self.on_logout)
        logout_btn.grid(row=0, column=1, sticky="e", padx=24, pady=16)

        sidebar = ctk.CTkScrollableFrame(self, fg_color=GRAY_50, width=280,
                                         corner_radius=0)
        sidebar.grid(row=1, column=0, sticky="ns", padx=(0, 0))
        sidebar.grid_columnconfigure(0, weight=1)
        self.sidebar = sidebar

        main_area = ctk.CTkScrollableFrame(self, fg_color=WHITE, corner_radius=0)
        main_area.grid(row=1, column=1, sticky="nsew")
        main_area.grid_columnconfigure(0, weight=1)
        self.main_area = main_area

        self._build_sidebar()
        self._build_main_header()
        self._rebuild_preguntas()

    def _build_sidebar(self):
        card = ctk.CTkFrame(self.sidebar, fg_color=WHITE, corner_radius=CORNER_RADIUS_LG)
        card.grid(row=0, column=0, sticky="ew", padx=16, pady=(16, 8))
        card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(card, text="Parámetros",
                     font=(FONT_FAMILY, FONT_SIZE_LG, "bold"),
                     text_color=GRAY_900).grid(row=0, column=0, sticky="w", padx=16, pady=(16, 12))

        ctk.CTkLabel(card, text="Título del Examen",
                     font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                     text_color=GRAY_700).grid(row=1, column=0, sticky="w", padx=16, pady=(0, 4))
        self.titulo_entry = ctk.CTkEntry(card, placeholder_text="Ej: Parcial 1 - Álgebra",
                                         font=(FONT_FAMILY, FONT_SIZE_MD),
                                         height=38, corner_radius=CORNER_RADIUS,
                                         border_color=GRAY_300, fg_color=GRAY_50,
                                         text_color=GRAY_900)
        self.titulo_entry.grid(row=2, column=0, sticky="ew", padx=16, pady=(0, 12))

        ctk.CTkLabel(card, text="Duración (Minutos)",
                     font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                     text_color=GRAY_700).grid(row=3, column=0, sticky="w", padx=16, pady=(0, 4))
        self.duracion_entry = ctk.CTkEntry(card, placeholder_text="Ej: 90",
                                           font=(FONT_FAMILY, FONT_SIZE_MD),
                                           height=38, corner_radius=CORNER_RADIUS,
                                           border_color=GRAY_300, fg_color=GRAY_50,
                                           text_color=GRAY_900)
        self.duracion_entry.grid(row=4, column=0, sticky="ew", padx=16, pady=(0, 12))

        ctk.CTkLabel(card, text="Cantidad de Intentos",
                     font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                     text_color=GRAY_700).grid(row=5, column=0, sticky="w", padx=16, pady=(0, 4))
        self.intentos_entry = ctk.CTkEntry(card, placeholder_text="Ej: 1",
                                           font=(FONT_FAMILY, FONT_SIZE_MD),
                                           height=38, corner_radius=CORNER_RADIUS,
                                           border_color=GRAY_300, fg_color=GRAY_50,
                                           text_color=GRAY_900)
        self.intentos_entry.grid(row=6, column=0, sticky="ew", padx=16, pady=(0, 16))

        security_card = ctk.CTkFrame(self.sidebar, fg_color=WHITE,
                                     corner_radius=CORNER_RADIUS_LG)
        security_card.grid(row=1, column=0, sticky="ew", padx=16, pady=(0, 8))
        security_card.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(security_card, text="Protocolo Antifraude",
                     font=(FONT_FAMILY, FONT_SIZE_LG, "bold"),
                     text_color=GRAY_900).grid(row=0, column=0, sticky="w", padx=16, pady=(16, 12))

        self.fullscreen_var = ctk.BooleanVar(value=True)
        self.clipboard_var = ctk.BooleanVar(value=True)
        self.random_order_var = ctk.BooleanVar(value=True)
        self.random_variants_var = ctk.BooleanVar(value=True)

        toggles = [
            ("Pantalla completa obligatoria", self.fullscreen_var),
            ("Bloquear portapapeles", self.clipboard_var),
            ("Orden aleatorio de preguntas", self.random_order_var),
            ("Variantes aleatorias por pregunta", self.random_variants_var),
        ]
        for i, (label, var) in enumerate(toggles):
            cb = ctk.CTkCheckBox(security_card, text=label, variable=var,
                                 font=(FONT_FAMILY, FONT_SIZE_SM),
                                 text_color=GRAY_700, fg_color=PRIMARY,
                                 hover_color=PRIMARY_HOVER, corner_radius=4,
                                 border_color=GRAY_300, border_width=2,
                                 checkbox_height=20, checkbox_width=20)
            cb.grid(row=i + 1, column=0, sticky="w", padx=16, pady=(0, 10))

        action_card = ctk.CTkFrame(self.sidebar, fg_color=WHITE,
                                   corner_radius=CORNER_RADIUS_LG)
        action_card.grid(row=2, column=0, sticky="ew", padx=16, pady=(0, 16))
        action_card.grid_columnconfigure(0, weight=1)

        save_btn = ctk.CTkButton(action_card, text="Guardar y Publicar",
                                 font=(FONT_FAMILY, FONT_SIZE_MD, "bold"),
                                 height=44, corner_radius=CORNER_RADIUS,
                                 fg_color=PRIMARY, hover_color=PRIMARY_HOVER,
                                 text_color=WHITE, command=self._handle_save)
        save_btn.grid(row=0, column=0, sticky="ew", padx=16, pady=16)

    def _build_main_header(self):
        header_area = ctk.CTkFrame(self.main_area, fg_color=WHITE, corner_radius=0)
        header_area.grid(row=0, column=0, sticky="ew", padx=24, pady=(16, 4))
        header_area.grid_columnconfigure(0, weight=1)

        ctk.CTkLabel(header_area, text="Estructura de Preguntas y Variantes",
                     font=(FONT_FAMILY, FONT_SIZE_LG, "bold"),
                     text_color=GRAY_900).grid(row=0, column=0, sticky="w")

        ctk.CTkLabel(header_area, text="Agregá grupos de preguntas con sus variantes de enunciado.",
                     font=(FONT_FAMILY, FONT_SIZE_SM),
                     text_color=GRAY_500).grid(row=1, column=0, sticky="w", pady=(2, 12))

        add_btn = ctk.CTkButton(header_area, text="+ Añadir Pregunta Estructural",
                                font=(FONT_FAMILY, FONT_SIZE_MD, "bold"),
                                height=40, corner_radius=CORNER_RADIUS,
                                fg_color=PRIMARY_LIGHT, hover_color=GRAY_200,
                                text_color=PRIMARY, command=self._agregar_pregunta)
        add_btn.grid(row=2, column=0, sticky="w", pady=(0, 8))

        self.preguntas_container = ctk.CTkFrame(self.main_area, fg_color=WHITE,
                                                corner_radius=0)
        self.preguntas_container.grid(row=1, column=0, sticky="nsew", padx=24, pady=(0, 24))
        self.preguntas_container.grid_columnconfigure(0, weight=1)

    def _rebuild_preguntas(self):
        for w in self.preguntas_container.winfo_children():
            w.destroy()

        if not self.preguntas:
            empty_lbl = ctk.CTkLabel(self.preguntas_container,
                                     text="Todavía no hay preguntas. Hacé clic en «+ Añadir Pregunta Estructural» para comenzar.",
                                     font=(FONT_FAMILY, FONT_SIZE_MD),
                                     text_color=GRAY_400)
            empty_lbl.grid(row=0, column=0, pady=40)
            return

        for idx, pregunta in enumerate(self.preguntas):
            self._render_pregunta(idx)

    def _render_pregunta(self, idx):
        pregunta = self.preguntas[idx]

        card = ctk.CTkFrame(self.preguntas_container, fg_color=GRAY_50,
                            corner_radius=CORNER_RADIUS_LG, border_width=1,
                            border_color=GRAY_200)
        card.grid(row=idx, column=0, sticky="ew", pady=(0, 12))
        card.grid_columnconfigure(1, weight=1)

        badge = ctk.CTkLabel(card, text=f"Pregunta {idx + 1}",
                             font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                             fg_color=PRIMARY_LIGHT, text_color=PRIMARY,
                             corner_radius=4, padx=8, pady=4)
        badge.grid(row=0, column=0, padx=(12, 8), pady=12, sticky="w")

        pregunta["entry"] = ctk.CTkEntry(card,
                                         placeholder_text="Eje conceptual (ej: Límites y Continuidad)",
                                         font=(FONT_FAMILY, FONT_SIZE_MD),
                                         height=38, corner_radius=CORNER_RADIUS,
                                         border_color=GRAY_300, fg_color=WHITE,
                                         text_color=GRAY_900)
        pregunta["entry"].grid(row=0, column=1, sticky="ew", padx=(0, 8), pady=12)
        if pregunta.get("titulo"):
            pregunta["entry"].insert(0, pregunta["titulo"])

        delete_btn = ctk.CTkButton(card, text="🗑", width=36, height=36,
                                   corner_radius=CORNER_RADIUS,
                                   fg_color=DANGER_LIGHT, hover_color=DANGER,
                                   text_color=DANGER,
                                   command=lambda i=idx: self._eliminar_pregunta(i))
        delete_btn.grid(row=0, column=2, padx=(0, 12), pady=12)

        variantes_frame = ctk.CTkFrame(card, fg_color="transparent")
        variantes_frame.grid(row=1, column=0, columnspan=3, sticky="ew", padx=12, pady=(0, 12))
        variantes_frame.grid_columnconfigure(0, weight=1)

        for vidx, variante in enumerate(pregunta["variantes"]):
            self._render_variante(card, variantes_frame, idx, vidx)

        add_var_btn = ctk.CTkButton(card, text="+ Agregar Variante Aleatoria",
                                    font=(FONT_FAMILY, FONT_SIZE_SM),
                                    height=32, corner_radius=CORNER_RADIUS,
                                    fg_color=WHITE, hover_color=GRAY_100,
                                    text_color=GRAY_600, border_width=1,
                                    border_color=GRAY_300,
                                    command=lambda i=idx: self._agregar_variante(i))
        add_var_btn.grid(row=2, column=0, columnspan=3, sticky="w", padx=12, pady=(0, 12))

    def _render_variante(self, parent_card, container, pidx, vidx):
        pregunta = self.preguntas[pidx]
        variante = pregunta["variantes"][vidx]

        var_frame = ctk.CTkFrame(container, fg_color=WHITE, corner_radius=CORNER_RADIUS,
                                 border_width=1, border_color=GRAY_200)
        var_frame.grid(row=vidx, column=0, sticky="ew", pady=(0, 8))
        var_frame.grid_columnconfigure(1, weight=1)

        lbl = ctk.CTkLabel(var_frame,
                           text=f"Variante Alternativa {vidx + 1} (Aleatoria)",
                           font=(FONT_FAMILY, FONT_SIZE_SM, "bold"),
                           text_color=GRAY_600)
        lbl.grid(row=0, column=0, padx=(10, 6), pady=8, sticky="w")

        if not variante.get("tipo_display"):
            tipo_map_reverse = {"mc": "Multiple Choice", "abierta": "A Desarrollar / Ensayo", "code": "Programación / SQL"}
            variante["tipo_display"] = tipo_map_reverse.get(variante.get("tipo", "mc"), "Multiple Choice")

        variante["tipo_var"] = ctk.StringVar(value=variante["tipo_display"])
        tipo_menu = ctk.CTkOptionMenu(var_frame, variable=variante["tipo_var"],
                                      values=["Multiple Choice", "A Desarrollar / Ensayo",
                                              "Programación / SQL"],
                                      font=(FONT_FAMILY, FONT_SIZE_SM),
                                      fg_color=WHITE, button_color=GRAY_200,
                                      button_hover_color=GRAY_300,
                                      text_color=GRAY_700, dropdown_fg_color=WHITE,
                                      dropdown_hover_color=GRAY_100,
                                      dropdown_text_color=GRAY_700,
                                      corner_radius=CORNER_RADIUS,
                                      command=lambda choice, i=pidx, v=vidx: self._on_tipo_change(i, v, choice))
        tipo_menu.grid(row=0, column=1, sticky="ew", padx=(0, 6), pady=8)

        delete_var = ctk.CTkButton(var_frame, text="✕", width=28, height=28,
                                   corner_radius=4,
                                   fg_color="transparent", hover_color=DANGER_LIGHT,
                                   text_color=GRAY_400,
                                   command=lambda i=pidx, v=vidx: self._eliminar_variante(i, v))
        delete_var.grid(row=0, column=2, padx=(0, 8), pady=8)

        variante["enunciado_entry"] = ctk.CTkTextbox(var_frame, height=70,
                                                     font=(FONT_FAMILY, FONT_SIZE_MD),
                                                     corner_radius=CORNER_RADIUS,
                                                     border_color=GRAY_300,
                                                     border_width=1,
                                                     fg_color=GRAY_50, text_color=GRAY_900,
                                                     activate_scrollbars=False)
        variante["enunciado_entry"].grid(row=1, column=0, columnspan=3, sticky="ew",
                                         padx=10, pady=(0, 8))
        if variante.get("enunciado"):
            variante["enunciado_entry"].insert("0.0", variante["enunciado"])

        is_mc = variante["tipo_var"].get() in ("Multiple Choice",)
        opciones_frame = ctk.CTkFrame(var_frame, fg_color="transparent")
        opciones_frame.grid(row=2, column=0, columnspan=3, sticky="ew", padx=10, pady=(0, 8))
        opciones_frame.grid_columnconfigure(1, weight=1)

        variante["opciones_container"] = opciones_frame
        variante["opciones"] = variante.get("opciones", [])
        if not variante["opciones"]:
            variante["opciones"].append({"texto": "", "correcta": False})
            variante["opciones"].append({"texto": "", "correcta": False})

        if is_mc:
            self._render_opciones(var_frame, opciones_frame, pidx, vidx)
            add_op_btn = ctk.CTkButton(var_frame, text="+ Añadir Opción",
                                       font=(FONT_FAMILY, FONT_SIZE_SM),
                                       height=28, corner_radius=CORNER_RADIUS,
                                       fg_color=WHITE, hover_color=GRAY_100,
                                       text_color=GRAY_600, border_width=1,
                                       border_color=GRAY_300,
                                       command=lambda i=pidx, v=vidx: self._agregar_opcion(i, v))
            add_op_btn.grid(row=3, column=0, columnspan=3, sticky="w", padx=10, pady=(0, 8))
        else:
            for w in opciones_frame.winfo_children():
                w.destroy()
            ctk.CTkLabel(opciones_frame, text="Pregunta a desarrollar — sin opciones predefinidas.",
                         font=(FONT_FAMILY, FONT_SIZE_SM),
                         text_color=GRAY_500).grid(row=0, column=0, pady=4)

    def _render_opciones(self, var_frame, container, pidx, vidx):
        for w in container.winfo_children():
            w.destroy()

        variante = self.preguntas[pidx]["variantes"][vidx]
        correcta_var = ctk.StringVar(value="")
        for oidx, opcion in enumerate(variante["opciones"]):
            if opcion.get("correcta"):
                correcta_var.set(str(oidx))

            rb = ctk.CTkRadioButton(container, text="",
                                    variable=correcta_var, value=str(oidx),
                                    fg_color=PRIMARY, border_color=GRAY_300,
                                    border_width_unchecked=2,
                                    hover_color=PRIMARY_HOVER,
                                    command=lambda i=pidx, v=vidx, o=oidx: self._marcar_correcta(i, v, o))
            rb.grid(row=oidx, column=0, padx=(0, 6), pady=4, sticky="w")

            opcion["entry"] = ctk.CTkEntry(container,
                                           placeholder_text=f"Opción {oidx + 1}",
                                           font=(FONT_FAMILY, FONT_SIZE_MD),
                                           height=36, corner_radius=CORNER_RADIUS,
                                           border_color=GRAY_300, fg_color=WHITE,
                                           text_color=GRAY_900)
            opcion["entry"].grid(row=oidx, column=1, sticky="ew", padx=(0, 6), pady=4)
            if opcion.get("texto"):
                opcion["entry"].insert(0, opcion["texto"])

            del_op = ctk.CTkButton(container, text="✕", width=28, height=28,
                                   corner_radius=4,
                                   fg_color="transparent", hover_color=DANGER_LIGHT,
                                   text_color=GRAY_400,
                                   command=lambda i=pidx, v=vidx, o=oidx: self._eliminar_opcion(i, v, o))
            del_op.grid(row=oidx, column=2, padx=(0, 0), pady=4)

        variante["correcta_var"] = correcta_var

    def _on_tipo_change(self, pidx, vidx, choice):
        self.preguntas[pidx]["variantes"][vidx]["tipo_display"] = choice
        self._rebuild_preguntas()

    def _agregar_pregunta(self):
        self.preguntas.append({
            "titulo": "",
            "entry": None,
            "variantes": [
                {"tipo": "mc", "tipo_display": "Multiple Choice", "tipo_var": None,
                 "enunciado": "", "enunciado_entry": None, "opciones": [
                     {"texto": "", "correcta": False},
                     {"texto": "", "correcta": False}
                 ], "correcta_var": None, "opciones_container": None}
            ]
        })
        self._rebuild_preguntas()

    def _eliminar_pregunta(self, idx):
        self.preguntas.pop(idx)
        self._rebuild_preguntas()

    def _agregar_variante(self, pidx):
        pregunta = self.preguntas[pidx]
        pregunta["variantes"].append({
            "tipo": "mc", "tipo_display": "Multiple Choice", "tipo_var": None,
            "enunciado": "", "enunciado_entry": None, "opciones": [
                {"texto": "", "correcta": False},
                {"texto": "", "correcta": False}
            ], "correcta_var": None, "opciones_container": None
        })
        self._rebuild_preguntas()

    def _eliminar_variante(self, pidx, vidx):
        pregunta = self.preguntas[pidx]
        if len(pregunta["variantes"]) > 1:
            pregunta["variantes"].pop(vidx)
            self._rebuild_preguntas()

    def _agregar_opcion(self, pidx, vidx):
        variante = self.preguntas[pidx]["variantes"][vidx]
        variante["opciones"].append({"texto": "", "correcta": False, "entry": None})
        self._rebuild_preguntas()

    def _eliminar_opcion(self, pidx, vidx, oidx):
        variante = self.preguntas[pidx]["variantes"][vidx]
        if len(variante["opciones"]) > 2:
            variante["opciones"].pop(oidx)
            self._rebuild_preguntas()

    def _marcar_correcta(self, pidx, vidx, oidx):
        variante = self.preguntas[pidx]["variantes"][vidx]
        for i, opcion in enumerate(variante["opciones"]):
            opcion["correcta"] = (i == oidx)

    def _handle_save(self):
        titulo = self.titulo_entry.get().strip()
        duracion = self.duracion_entry.get().strip()
        intentos = self.intentos_entry.get().strip()

        errors = []
        if not titulo:
            errors.append("El título del examen es obligatorio.")
        if not duracion or not duracion.isdigit():
            errors.append("La duración debe ser un número entero en minutos.")
        if not intentos or not intentos.isdigit() or int(intentos) < 1:
            errors.append("La cantidad de intentos debe ser un número entero >= 1.")
        if not self.preguntas:
            errors.append("El examen debe contener al menos un Grupo de Preguntas estructural.")

        for i, p in enumerate(self.preguntas):
            tit = p["entry"].get().strip() if p["entry"] else p.get("titulo", "")
            if not tit:
                errors.append(f"Pregunta {i + 1}: el eje conceptual no puede estar vacío.")
            for j, v in enumerate(p["variantes"]):
                enunciado = v["enunciado_entry"].get("0.0", "end").strip() if v[
                    "enunciado_entry"] else v.get("enunciado", "")
                if not enunciado:
                    errors.append(f"Pregunta {i + 1}, Variante {j + 1}: el enunciado no puede estar vacío.")
                if v.get("tipo_display", v["tipo_var"].get()) == "Multiple Choice":
                    ops = v.get("opciones", [])
                    if len(ops) < 2:
                        errors.append(f"Pregunta {i + 1}: debe tener al menos 2 opciones de respuesta.")
                    correctas = [o for o in ops if o.get("correcta")]
                    if len(correctas) != 1:
                        errors.append(f"Pregunta {i + 1}: debes marcar exactamente una opción como correcta.")
                    for k, o in enumerate(ops):
                        txt = o.get("entry", None)
                        txt_val = txt.get().strip() if txt else o.get("texto", "")
                        if not txt_val:
                            errors.append(f"Pregunta {i + 1}, Opción {k + 1}: el texto no puede estar vacío.")

        if errors:
            error_msg = "\n".join(f"• {e}" for e in errors)
            CTkMessagebox(title="Error de Validación", message=error_msg,
                          icon="cancel", option_1="Cerrar",
                          button_color=DANGER, button_text_color=WHITE)
            return

        seguridad = []
        if self.fullscreen_var.get():
            seguridad.append("Pantalla completa obligatoria")
        if self.clipboard_var.get():
            seguridad.append("Bloquear portapapeles")
        if self.random_order_var.get():
            seguridad.append("Orden aleatorio de preguntas")
        if self.random_variants_var.get():
            seguridad.append("Variantes aleatorias por pregunta")

        grupos = []
        for p in self.preguntas:
            variantes = []
            for v in p["variantes"]:
                enunciado = v["enunciado_entry"].get("0.0", "end").strip() if v[
                    "enunciado_entry"] else v.get("enunciado", "")
                tipo_raw = v.get("tipo_display", v["tipo_var"].get())
                tipo_map = {"Multiple Choice": "mc",
                            "A Desarrollar / Ensayo": "abierta",
                            "Programación / SQL": "code"}
                tipo = tipo_map.get(tipo_raw, "mc")
                variante = {"Enunciado": enunciado, "Tipo": tipo}
                if tipo == "mc":
                    ops = []
                    for o in v["opciones"]:
                        txt = o.get("entry", None)
                        txt_val = txt.get().strip() if txt else o.get("texto", "")
                        ops.append({"Texto": txt_val, "EsCorrecta": o.get("correcta", False)})
                    variante["Opciones"] = ops
                variantes.append(variante)
            tit_preg = p["entry"].get().strip() if p["entry"] else p.get("titulo", "")
            grupos.append({"TituloReferencia": tit_preg, "Variantes": variantes})

        payload = {
            "Titulo": titulo,
            "Descripcion": "Creado desde el configurador avanzado de EXAMIO.",
            "Tipo": "evaluacion",
            "CantidadIntentosMaximos": int(intentos),
            "DuracionMinutos": int(duracion),
            "RecursosPermitidos": ", ".join(seguridad),
            "GruposPreguntas": grupos
        }

        print("=" * 60)
        print("JSON DE EXAMEN GENERADO:")
        print("=" * 60)
        print(json.dumps(payload, indent=2, ensure_ascii=False))
        print("=" * 60)

        CTkMessagebox(title="Examen Guardado",
                      message="El examen se ha guardado y publicado correctamente.\nRevisá la consola para ver el JSON generado.",
                      icon="check", option_1="Aceptar",
                      button_color=SUCCESS, button_text_color=WHITE)
